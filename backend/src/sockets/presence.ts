import { Server } from 'socket.io';

/**
 * Tracks active Socket.io connections per user.
 * Map<userId, activeSocketCount>
 */
const userConnections = new Map<string, number>();

export class PresenceManager {
  static handleConnect(userId: string, io: Server): number {
    const currentCount = userConnections.get(userId) || 0;
    userConnections.set(userId, currentCount + 1);

    const onlineCount = PresenceManager.getOnlineCount();
    io.to('global:admin').emit('presence:count', {
      onlineCount,
      timestamp: new Date().toISOString(),
    });

    return onlineCount;
  }

  static handleDisconnect(userId: string, io: Server): number {
    const currentCount = userConnections.get(userId) || 0;
    if (currentCount <= 1) {
      userConnections.delete(userId);
    } else {
      userConnections.set(userId, currentCount - 1);
    }

    const onlineCount = PresenceManager.getOnlineCount();
    io.to('global:admin').emit('presence:count', {
      onlineCount,
      timestamp: new Date().toISOString(),
    });

    return onlineCount;
  }

  static getOnlineCount(): number {
    return userConnections.size;
  }

  static isUserOnline(userId: string): boolean {
    return userConnections.has(userId);
  }
}
