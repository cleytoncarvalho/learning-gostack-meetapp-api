import Meetup from '../models/Meetup';
import File from '../models/File';

class OrganizingController {
  async index(req, res) {
    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      order: [['date', 'ASC']],
    });

    return res.json(meetups);
  }

  async show(req, res) {
    const meetups = await Meetup.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId,
      },
      include: [
        {
          model: File,
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.json(meetups);
  }
}

export default new OrganizingController();
