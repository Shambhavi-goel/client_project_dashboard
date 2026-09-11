import prisma from '../../lib/prisma';
import { NotFoundError } from '../../middleware/errorHandler';
import { CreateClientInput, UpdateClientInput } from './clients.schemas';

export class ClientsService {
  static async getAll() {
    return prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });
  }

  static async getById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    return client;
  }

  static async create(input: CreateClientInput) {
    return prisma.client.create({
      data: input,
    });
  }

  static async update(id: string, input: UpdateClientInput) {
    await ClientsService.getById(id);
    return prisma.client.update({
      where: { id },
      data: input,
    });
  }

  static async delete(id: string) {
    await ClientsService.getById(id);
    return prisma.client.delete({
      where: { id },
    });
  }
}
