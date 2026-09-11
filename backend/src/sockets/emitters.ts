import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setSocketServer(io: Server) {
  ioInstance = io;
}

export function getSocketServer(): Server | null {
  return ioInstance;
}

export interface ActivityPayload {
  id: string;
  taskId: string;
  projectId: string;
  userId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  message: string;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    assignedDeveloperId: string;
  };
}

export class SocketEmitters {
  /**
   * Emits activity:new to:
   * 1. global:admin (all admins)
   * 2. project:<projectId>:managers (owning PM + all admins)
   * 3. user:<assignedDeveloperId> (strictly the assigned developer)
   */
  static emitActivityNew(
    activityLog: any,
    taskInfo: { id: string; projectId: string; assignedDeveloperId: string; title?: string; priority?: string }
  ): void {
    if (!ioInstance) return;

    const payload: ActivityPayload = {
      id: activityLog.id,
      taskId: activityLog.taskId,
      projectId: taskInfo.projectId,
      userId: activityLog.userId,
      fromStatus: activityLog.fromStatus,
      toStatus: activityLog.toStatus,
      message: activityLog.message,
      createdAt: activityLog.createdAt,
      user: activityLog.user || null,
      task: {
        id: taskInfo.id,
        title: taskInfo.title || '',
        status: activityLog.toStatus || 'TODO',
        priority: taskInfo['priority'] || 'MEDIUM',
        assignedDeveloperId: taskInfo.assignedDeveloperId,
      },
    };

    // 1. Cross-project feed for Admins
    ioInstance.to('global:admin').emit('activity:new', payload);

    // 2. Project Managers room (owning PM + Admins)
    ioInstance.to(`project:${taskInfo.projectId}:managers`).emit('activity:new', payload);

    // 3. Assigned developer's personal room ONLY (never other developers!)
    if (taskInfo.assignedDeveloperId) {
      ioInstance.to(`user:${taskInfo.assignedDeveloperId}`).emit('activity:new', payload);
    }
  }

  /**
   * Emits notification:new to specific user's personal room
   */
  static emitNotificationNew(userId: string, notification: any, unreadCount: number): void {
    if (!ioInstance) return;

    ioInstance.to(`user:${userId}`).emit('notification:new', {
      notification,
      unreadCount,
    });
  }
}
