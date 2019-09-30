import { Op } from 'sequelize';

import Subscription from '../models/Subscription';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

import Queue from '../../lib/Queue';
import SubscriptionMail from '../jobs/SubscriptionMail';

class SubscriptionController {
  async index(req, res) {
    const where = { user_id: req.userId };
    const whereMeetup = {
      date: {
        [Op.gt]: new Date(),
      },
    };

    const page = req.query.page || 1;
    const per_page = req.query.per_page || 10;

    const totalSubscriptions = await Subscription.count({
      where,
      include: [
        {
          model: Meetup,
          required: true,
          where: whereMeetup,
        },
      ],
    });

    const totalPages =
      totalSubscriptions > per_page
        ? Math.ceil(totalSubscriptions / per_page)
        : 1;

    const subscriptions = await Subscription.findAll({
      where,
      include: [
        {
          model: Meetup,
          required: true,
          where: whereMeetup,
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'email'],
            },
            {
              model: File,
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
      limit: per_page,
      offset: per_page * page - per_page,
      order: [[Meetup, 'date']],
    });

    return res.json({
      subscriptions,
      pagination: {
        pages: totalPages,
        total: totalSubscriptions,
      },
    });
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!meetup) {
      return res.status(404).json({ error: 'Meetup not found' });
    }

    if (meetup.user_id === user.id) {
      return res
        .status(401)
        .json({ error: "Can't subscribe to your own meetups" });
    }

    if (meetup.past) {
      return res.status(400).json({ error: "Can't subscribe to past meetups" });
    }

    const checkAlreadySubscribed = await Subscription.findOne({
      where: {
        meetup_id: meetup.id,
        user_id: user.id,
      },
    });

    if (checkAlreadySubscribed) {
      return res
        .status(400)
        .json({ error: 'You are already subscribed for this meetup' });
    }

    const checkSameDate = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (checkSameDate) {
      return res
        .status(400)
        .json({ error: "Can't subscribe to two meetups at the same time" });
    }

    const subscription = await Subscription.create({
      meetup_id: meetup.id,
      user_id: user.id,
    });

    await Queue.add(SubscriptionMail.key, {
      meetup,
      user,
    });

    return res.json(subscription);
  }

  async delete(req, res) {
    const user_id = req.userId;

    const subscription = await Subscription.findOne({
      where: {
        meetup_id: req.params.id,
        user_id,
      },
      include: [
        {
          model: Meetup,
          required: true,
        },
      ],
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.Meetup.past) {
      return res
        .status(400)
        .json({ error: "Can't unsubscribe to past meetups" });
    }

    await subscription.destroy();

    return res.json();
  }
}

export default new SubscriptionController();
