import cron, { ScheduledTask } from 'node-cron';
import prisma from '../lib/prisma';
import { TaskStatus, NotificationType } from '@prisma/client';
import { SocketEmitters } from '../sockets/emitters';

let cronTask: ScheduledTask | null = null;

/**
 * Scans for overdue tasks:
 * Find tasks with dueDate < now, status != DONE, isOverdue = false.
 * Marks them isOverdue = true.
 * Inserts a system TaskActivityLog row (userId null).
 * Emits activity:new live.
 */
export async function runOverdueScan(): Promise<number> {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: TaskStatus.DONE },
      isOverdue: false,
    },
    include: {
      project: { select: { id: true, name: true, createdById: true } },
      assignedDeveloper: { select: { id: true, name: true, email: true } },
    },
  });

  if (overdueTasks.length === 0) {
    return 0;
  }

  console.log(`⏰ Overdue scanner found ${overdueTasks.length} task(s) becoming overdue.`);

  for (const task of overdueTasks) {
    // 1. Mark task as overdue
    await prisma.task.update({
      where: { id: task.id },
      data: { isOverdue: true },
    });

    // 2. Insert system TaskActivityLog row (userId: null)
    const message = `System: "${task.title}" is now overdue`;
    const activityLog = await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        projectId: task.projectId,
        userId: null,
        fromStatus: null,
        toStatus: null,
        message,
      },
    });

    // 3. Emit activity:new live to rooms
    SocketEmitters.emitActivityNew(activityLog, task);

    // 4. Create notification for assigned developer
    if (task.assignedDeveloperId) {
      const notification = await prisma.notification.create({
        data: {
          userId: task.assignedDeveloperId,
          type: NotificationType.TASK_OVERDUE,
          message: `Task "${task.title}" is now overdue!`,
          relatedTaskId: task.id,
        },
      });

      const unreadCount = await prisma.notification.count({
        where: { userId: task.assignedDeveloperId, isRead: false },
      });

      SocketEmitters.emitNotificationNew(task.assignedDeveloperId, notification, unreadCount);
    }
  }

  return overdueTasks.length;
}

// Initializes and starts node-cron scanner (runs every 5 minutes)
export function startOverdueScanner(): ScheduledTask {
  if (cronTask) {
    return cronTask;
  }

  // Every 5 minutes
  cronTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await runOverdueScan();
    } catch (err) {
      console.error('Error in overdue scanner background job:', err);
    }
  });

  console.log('⏱️  Background job: Overdue scanner scheduled (every 5 minutes)');
  return cronTask;
}

export function stopOverdueScanner(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}
