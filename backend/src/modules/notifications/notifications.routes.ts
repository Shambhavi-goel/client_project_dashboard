import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { listNotificationsQuerySchema } from './notifications.schemas';

const router = Router();

router.use(authenticate);

// Get notifications with unread badge count
router.get(
  '/',
  validate({ query: listNotificationsQuerySchema }),
  NotificationsController.getAll
);

// Fast unread count endpoint
router.get('/unread-count', NotificationsController.getUnreadCount);

// Mark all notifications as read
router.patch('/read-all', NotificationsController.markAllAsRead);

// Mark single notification as read
router.patch('/:id/read', NotificationsController.markAsRead);

export default router;
