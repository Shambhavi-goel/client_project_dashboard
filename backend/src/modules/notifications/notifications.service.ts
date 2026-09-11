import prisma from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { NotFoundError } from '../../middleware/errorHandler';
import { SocketEmitters } from '../../sockets/emitters';

export class NotificationsService {
  /**
   * Get user's notifications and unread badge count
   */
  static async getUserNotifications(userId: string, limit: number = 20) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        include: {
          relatedTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              projectId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Fast check for unread count badge
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark individual notification as read (must belong to userId, 404 on mismatch)
   */
  static async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    const unreadCount = await this.getUnreadCount(userId);

    return {
      notification: updated,
      unreadCount,
    };
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      unreadCount: 0,
      message: 'All notifications marked as read',
    };
  }

  /**
   * Helper: creates notification in DB and pushes real-time event with fresh unread count
   */
  static async createAndPush(
    userId: string,
    type: NotificationType,
    message: string,
    relatedTaskId?: string
  ) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        relatedTaskId: relatedTaskId || null,
      },
      include: {
        relatedTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            projectId: true,
          },
        },
      },
    });

    const unreadCount = await this.getUnreadCount(userId);

    // Push real-time event to user's personal room
    SocketEmitters.emitNotificationNew(userId, notification, unreadCount);

    return {
      notification,
      unreadCount,
    };
  }
}
