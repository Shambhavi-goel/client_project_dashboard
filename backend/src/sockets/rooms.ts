import { Socket } from 'socket.io';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthUser } from '../types/express';

export class RoomManager {
  /**
   * Joins socket to appropriate rooms based on user role and project ownership.
   */
  static async setupUserRooms(socket: Socket, user: AuthUser): Promise<void> {
    // 1. Every user joins their personal room for direct events and developer-scoped task alerts
    const personalRoom = `user:${user.id}`;
    socket.join(personalRoom);

    // 2. Admin joins global admin feed and all project manager rooms
    if (user.role === Role.ADMIN) {
      socket.join('global:admin');

      // Admins join all project manager rooms
      const allProjects = await prisma.project.findMany({ select: { id: true } });
      for (const p of allProjects) {
        socket.join(`project:${p.id}:managers`);
      }
    }

    // 3. PM joins only manager rooms for projects they created
    if (user.role === Role.PM) {
      const ownedProjects = await prisma.project.findMany({
        where: { createdById: user.id },
        select: { id: true },
      });

      for (const p of ownedProjects) {
        socket.join(`project:${p.id}:managers`);
      }
    }

    // DEVELOPER only stays in user:<userId> room (ensuring they never hear other dev's activity)
  }

  /**
   * Helper to make all connected PMs/Admins join a newly created project's room
   */
  static joinProjectRoom(socket: Socket, projectId: string): void {
    socket.join(`project:${projectId}:managers`);
  }
}
