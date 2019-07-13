// import { isBefore, parse } from 'date-fns';
// import { Op } from 'sequelize';

import Subscription from '../models/Subscription';
import Meetup from '../models/Meetup';

class SubscriptionController {
  async store(req, res) {
    const user_id = req.userId;
    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.user_id === user_id) {
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
        user_id,
      },
    });

    if (checkAlreadySubscribed) {
      return res
        .status(400)
        .json({ error: 'You are already subscribed for this meetup' });
    }

    const checkSameDate = await Subscription.findOne({
      where: {
        user_id,
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
      user_id,
    });

    return res.json(subscription);
  }
}

export default new SubscriptionController();
