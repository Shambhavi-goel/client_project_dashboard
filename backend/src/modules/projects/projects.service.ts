import prisma from '../../lib/prisma';
import { Role } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../middleware/errorHandler';
import { AuthUser } from '../../types/express';
import { CreateProjectInput, UpdateProjectInput } from './projects.schemas';

export class ProjectsService {
  /**
   * List projects scoped at the Prisma query level:
   * - ADMIN: all projects
   * - PM: projects where createdById === user.id
   * - DEVELOPER: projects where user has assigned tasks
   */
  static async getAll(user: AuthUser) {
    let whereClause: any = {};

    if (user.role === Role.PM) {
      whereClause = { createdById: user.id };
    } else if (user.role === Role.DEVELOPER) {
      whereClause = {
        tasks: {
          some: { assignedDeveloperId: user.id },
        },
      };
    }
    // ADMIN has empty whereClause (sees all)

    return prisma.project.findMany({
      where: whereClause,
      include: {
        client: {
          select: { id: true, name: true, contactEmail: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single project with strict ownership verification:
   * Return 404 on ownership mismatch (not 403) per spec.
   */
  static async getById(id: string, user: AuthUser) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Role-based ownership check: return 404 on mismatch to avoid leaking existence
    if (user.role === Role.PM && project.createdById !== user.id) {
      throw new NotFoundError('Project not found');
    }

    if (user.role === Role.DEVELOPER) {
      const hasTask = await prisma.task.findFirst({
        where: {
          projectId: id,
          assignedDeveloperId: user.id,
        },
      });
      if (!hasTask) {
        throw new NotFoundError('Project not found');
      }
    }

    return project;
  }

  /**
   * Create project: ADMIN or PM
   */
  static async create(input: CreateProjectInput, user: AuthUser) {
    // Check client exists
    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
    });
    if (!client) {
      throw new BadRequestError('Client not found');
    }

    // If PM, creator must be PM self; If ADMIN, can specify or defaults to self
    const createdById = user.role === Role.PM ? user.id : (input.createdById || user.id);

    return prisma.project.create({
      data: {
        name: input.name,
        clientId: input.clientId,
        createdById,
      },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Update project: ADMIN or owning PM (404 on mismatch)
   */
  static async update(id: string, input: UpdateProjectInput, user: AuthUser) {
    // Verify ownership (throws 404 on mismatch)
    const project = await ProjectsService.getById(id, user);

    if (user.role === Role.PM && project.createdById !== user.id) {
      throw new NotFoundError('Project not found');
    }

    if (input.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
      });
      if (!client) {
        throw new BadRequestError('Client not found');
      }
    }

    return prisma.project.update({
      where: { id },
      data: input,
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Delete project: ADMIN or owning PM (404 on mismatch)
   */
  static async delete(id: string, user: AuthUser) {
    const project = await ProjectsService.getById(id, user);

    if (user.role === Role.PM && project.createdById !== user.id) {
      throw new NotFoundError('Project not found');
    }

    return prisma.project.delete({
      where: { id },
    });
  }
}
