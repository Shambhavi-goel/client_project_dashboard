import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthUser } from '../../types/express';
import { ListNotificationsQuery } from './notifications.schemas';

export class NotificationsController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const query = req.query as unknown as ListNotificationsQuery;
      const result = await NotificationsService.getUserNotifications(user.id, query.limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const count = await NotificationsService.getUnreadCount(user.id);
      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const result = await NotificationsService.markAsRead(req.params.id as string, user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const result = await NotificationsService.markAllAsRead(user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
