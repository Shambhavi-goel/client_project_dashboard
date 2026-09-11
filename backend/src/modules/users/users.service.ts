import prisma from '../../lib/prisma';
import { Role } from '@prisma/client';
import { NotFoundError } from '../../middleware/errorHandler';

export class UsersService {
  static async getAll(role?: Role) {
    const where = role ? { role } : {};
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}
