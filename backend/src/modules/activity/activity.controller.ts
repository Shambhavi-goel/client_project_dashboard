import { Request, Response, NextFunction } from 'express';
import { ActivityService } from './activity.service';
import { AuthUser } from '../../types/express';
import { ActivityFeedQuery } from './activity.schemas';

export class ActivityController {
  static async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ActivityFeedQuery;
      const feed = await ActivityService.getFeed(req.user as AuthUser, query);
      res.status(200).json({ success: true, data: feed });
    } catch (error) {
      next(error);
    }
  }
}
