import prisma from '../../lib/prisma';
import { Role } from '@prisma/client';
import { NotFoundError } from '../../middleware/errorHandler';
import { AuthUser } from '../../types/express';
import { ActivityFeedQuery } from './activity.schemas';

export class ActivityService {
  /**
   * Missed-event catch-up: normal role-scoped REST endpoint reading from the DB (not memory).
   * - Client calls this on connect/reconnect BEFORE subscribing to live socket events.
   * - Scoping:
   *   - ADMIN: all activity or filtered by projectId
   *   - PM: activity on projects created by them
   *   - DEVELOPER: activity ONLY on tasks assigned to them (never other devs' tasks)
   */
  static async getFeed(user: AuthUser, query: ActivityFeedQuery) {
    const limit = query.limit || 20;
    const where: any = {};

    if (query.projectId) {
      // Verify project access first
      const project = await prisma.project.findUnique({
        where: { id: query.projectId },
        select: { id: true, createdById: true },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      if (user.role === Role.PM && project.createdById !== user.id) {
        throw new NotFoundError('Project not found');
      }

      if (user.role === Role.DEVELOPER) {
        const hasTask = await prisma.task.findFirst({
          where: {
            projectId: query.projectId,
            assignedDeveloperId: user.id,
          },
        });
        if (!hasTask) {
          throw new NotFoundError('Project not found');
        }
      }

      where.projectId = query.projectId;
    }

    // Role-based where scoping
    if (user.role === Role.PM && !query.projectId) {
      where.project = { createdById: user.id };
    } else if (user.role === Role.DEVELOPER) {
      // Developer only sees activity on tasks assigned to them
      where.task = { assignedDeveloperId: user.id };
    }

    const logs = await prisma.taskActivityLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignedDeveloperId: true,
          },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }
}
