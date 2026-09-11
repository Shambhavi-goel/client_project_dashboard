import prisma from '../../lib/prisma';
import { Role, TaskStatus, TaskPriority, NotificationType } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../middleware/errorHandler';
import { AuthUser } from '../../types/express';
import { CreateTaskInput, UpdateTaskInput, TaskFilterQuery } from './tasks.schemas';
import { SocketEmitters } from '../../sockets/emitters';

// Human-friendly status string formatter
export function formatStatus(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.TODO:
      return 'Todo';
    case TaskStatus.IN_PROGRESS:
      return 'In Progress';
    case TaskStatus.IN_REVIEW:
      return 'In Review';
    case TaskStatus.DONE:
      return 'Done';
    default:
      return status;
  }
}

// Hook callbacks that Phase 4 & 5 will attach
type TaskStatusChangeHook = (data: {
  task: any;
  activityLog: any;
  user: AuthUser;
}) => Promise<void> | void;

type TaskCreatedHook = (data: {
  task: any;
  user: AuthUser;
}) => Promise<void> | void;

export let onTaskStatusChanged: TaskStatusChangeHook | null = null;
export let onTaskCreated: TaskCreatedHook | null = null;

export function setTaskStatusChangeHook(hook: TaskStatusChangeHook) {
  onTaskStatusChanged = hook;
}

export function setTaskCreatedHook(hook: TaskCreatedHook) {
  onTaskCreated = hook;
}

export function markOverdueTasks<T extends { dueDate: Date | string | null; status: TaskStatus; isOverdue: boolean }>(tasks: T[]): T[] {
  const now = Date.now();
  return tasks.map((t) => {
    if (t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate).getTime() < now) {
      return { ...t, isOverdue: true };
    }
    return t;
  });
}

export class TasksService {
  /**
   * Builds the Prisma where clause applying role-scoping and validated query filters.
   */
  private static buildWhereClause(
    projectId: string | undefined,
    user: AuthUser,
    filters: TaskFilterQuery
  ) {
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    // Role-based scoping at query level
    if (user.role === Role.DEVELOPER) {
      // Developer can ONLY see tasks assigned to them
      where.assignedDeveloperId = user.id;
    } else if (user.role === Role.PM && !projectId) {
      // PM listing tasks globally without a specific project: only from projects they created
      where.project = { createdById: user.id };
    }

    // Apply URL query filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.dueFrom || filters.dueTo) {
      where.dueDate = {};
      if (filters.dueFrom) {
        where.dueDate.gte = new Date(filters.dueFrom);
      }
      if (filters.dueTo) {
        // If date string only (YYYY-MM-DD), set to end of that day
        const toDate = new Date(filters.dueTo);
        if (filters.dueTo.length === 10) {
          toDate.setHours(23, 59, 59, 999);
        }
        where.dueDate.lte = toDate;
      }
    }

    return where;
  }

  /**
   * List tasks for a specific project:
   * First checks project access (404 on mismatch), then applies query-level scoping.
   */
  static async getProjectTasks(projectId: string, user: AuthUser, filters: TaskFilterQuery) {
    // 1. Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, createdById: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (user.role === Role.PM && project.createdById !== user.id) {
      throw new NotFoundError('Project not found');
    }

    if (user.role === Role.DEVELOPER) {
      const hasAccess = await prisma.task.findFirst({
        where: {
          projectId,
          assignedDeveloperId: user.id,
        },
      });
      if (!hasAccess) {
        throw new NotFoundError('Project not found');
      }
    }

    // 2. Fetch scoped tasks
    const where = this.buildWhereClause(projectId, user, filters);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true, createdById: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    return markOverdueTasks(tasks);
  }

  /**
   * Get all tasks assigned to the authenticated user (developer shortcut)
   */
  static async getMyTasks(user: AuthUser, filters: TaskFilterQuery) {
    const where = this.buildWhereClause(undefined, user, filters);

    // Explicitly enforce assignedDeveloperId for this route if developer
    if (user.role === Role.DEVELOPER) {
      where.assignedDeveloperId = user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true, createdById: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    return markOverdueTasks(tasks);
  }

  /**
   * Single-resource endpoint:
   * Fetch then verify ownership. Returns 404 (not 403) on mismatch.
   */
  static async getById(id: string, user: AuthUser) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: {
            id: true,
            name: true,
            createdById: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        activityLogs: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Role-based scoping: return 404 on mismatch
    if (user.role === Role.PM && task.project.createdById !== user.id) {
      throw new NotFoundError('Task not found');
    }

    if (user.role === Role.DEVELOPER && task.assignedDeveloperId !== user.id) {
      throw new NotFoundError('Task not found');
    }

    return task;
  }

  /**
   * Create task within a project: ADMIN or owning PM
   */
  static async create(projectId: string, input: CreateTaskInput, user: AuthUser) {
    // 1. Verify project ownership (404 on mismatch)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, createdById: true, name: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (user.role === Role.PM && project.createdById !== user.id) {
      throw new NotFoundError('Project not found');
    }

    // 2. Verify assigned developer exists and has DEVELOPER role
    const developer = await prisma.user.findUnique({
      where: { id: input.assignedDeveloperId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!developer || developer.role !== Role.DEVELOPER) {
      throw new BadRequestError('Assigned user must be a valid DEVELOPER');
    }

    const dueDate = input.dueDate ? new Date(input.dueDate) : null;
    const isOverdue = dueDate ? dueDate < new Date() : false;

    const task = await prisma.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        assignedDeveloperId: input.assignedDeveloperId,
        priority: input.priority,
        dueDate,
        isOverdue,
      },
      include: {
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true, createdById: true },
        },
      },
    });

    // Create initial task activity log
    await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        projectId: task.projectId,
        userId: user.id,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: `${user.name} created task "${task.title}"`,
      },
    });

    // Trigger onTaskCreated hook if registered
    if (onTaskCreated) {
      try {
        await onTaskCreated({ task, user });
      } catch (err) {
        console.error('Task created hook error:', err);
      }
    }

    // Broadcast real-time task creation to project rooms
    SocketEmitters.emitTaskCreated(task);

    return task;
  }

  /**
   * Update task: ADMIN or owning PM
   */
  static async update(id: string, input: UpdateTaskInput, user: AuthUser) {
    const existing = await this.getById(id, user);

    if (user.role === Role.PM && existing.project.createdById !== user.id) {
      throw new NotFoundError('Task not found');
    }

    if (input.assignedDeveloperId) {
      const dev = await prisma.user.findUnique({
        where: { id: input.assignedDeveloperId },
      });
      if (!dev || dev.role !== Role.DEVELOPER) {
        throw new BadRequestError('Assigned user must be a valid DEVELOPER');
      }
    }

    const updateData: any = { ...input };
    if (input.dueDate !== undefined) {
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      if (updateData.dueDate && existing.status !== TaskStatus.DONE) {
        updateData.isOverdue = updateData.dueDate < new Date();
      }
    }

    return prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true, createdById: true },
        },
      },
    });
  }

  /**
   * Status change endpoint:
   * - ADMIN: any task
   * - PM: tasks in their project
   * - DEVELOPER: ONLY tasks assigned to them (404 on mismatch)
   * Inserts a TaskActivityLog row (persisted, never derived) recording who changed what and when.
   */
  static async updateStatus(id: string, newStatus: TaskStatus, user: AuthUser) {
    const task = await this.getById(id, user);

    const fromStatus = task.status;
    if (fromStatus === newStatus) {
      return task;
    }

    // Determine overdue state: if moved to DONE, isOverdue is cleared
    const isOverdue = newStatus === TaskStatus.DONE ? false : task.isOverdue;

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: newStatus,
        isOverdue,
      },
      include: {
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true, createdById: true },
        },
      },
    });

    // Human-readable message: "Ravi moved Task #12 from In Progress → In Review"
    const message = `${user.name} moved "${task.title}" from ${formatStatus(fromStatus)} → ${formatStatus(newStatus)}`;

    // Insert TaskActivityLog row (persisted)
    const activityLog = await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        projectId: task.projectId,
        userId: user.id,
        fromStatus,
        toStatus: newStatus,
        message,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Trigger onTaskStatusChanged hook (Socket.io and notifications)
    if (onTaskStatusChanged) {
      try {
        await onTaskStatusChanged({ task: updatedTask, activityLog, user });
      } catch (err) {
        console.error('Task status changed hook error:', err);
      }
    }

    return {
      task: updatedTask,
      activityLog,
    };
  }

  /**
   * Delete task: ADMIN or owning PM
   */
  static async delete(id: string, user: AuthUser) {
    const task = await this.getById(id, user);

    if (user.role === Role.PM && task.project.createdById !== user.id) {
      throw new NotFoundError('Task not found');
    }

    const deleted = await prisma.task.delete({
      where: { id },
    });

    SocketEmitters.emitTaskDeleted(id, task.projectId);

    return deleted;
  }
}
