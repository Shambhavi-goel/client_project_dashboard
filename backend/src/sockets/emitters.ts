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
    ioInstance.to('global:admin').emit('task:updated', payload.task);

    // 2. Project Viewers room (ALL users currently viewing this project)
    ioInstance.to(`project:${taskInfo.projectId}`).emit('activity:new', payload);
    ioInstance.to(`project:${taskInfo.projectId}`).emit('task:updated', payload.task);

    // 3. Project Managers room (owning PM + Admins)
    ioInstance.to(`project:${taskInfo.projectId}:managers`).emit('activity:new', payload);
    ioInstance.to(`project:${taskInfo.projectId}:managers`).emit('task:updated', payload.task);

    // 4. Assigned developer's personal room
    if (taskInfo.assignedDeveloperId) {
      ioInstance.to(`user:${taskInfo.assignedDeveloperId}`).emit('activity:new', payload);
      ioInstance.to(`user:${taskInfo.assignedDeveloperId}`).emit('task:updated', payload.task);
    }
  }

  /**
   * Emits task:created event
   */
  static emitTaskCreated(task: any): void {
    if (!ioInstance) return;
    ioInstance.to(`project:${task.projectId}`).emit('task:created', task);
    ioInstance.to(`project:${task.projectId}:managers`).emit('task:created', task);
    ioInstance.to('global:admin').emit('task:created', task);
    if (task.assignedDeveloperId) {
      ioInstance.to(`user:${task.assignedDeveloperId}`).emit('task:created', task);
    }
  }

  /**
   * Emits task:deleted event
   */
  static emitTaskDeleted(taskId: string, projectId: string): void {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit('task:deleted', { taskId, projectId });
    ioInstance.to(`project:${projectId}:managers`).emit('task:deleted', { taskId, projectId });
    ioInstance.to('global:admin').emit('task:deleted', { taskId, projectId });
  }

  /**
   * Emits project:created event
   */
  static emitProjectCreated(project: any): void {
    if (!ioInstance) return;
    ioInstance.to('global:admin').emit('project:created', project);
    ioInstance.to(`user:${project.createdById}`).emit('project:created', project);
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
