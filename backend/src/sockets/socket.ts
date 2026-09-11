import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser } from '../types/express';
import { RoomManager } from './rooms';
import { PresenceManager } from './presence';
import { setSocketServer } from './emitters';

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  setSocketServer(io);

  // ─── Handshake Authentication Middleware ────────────────────────────────────

  io.use((socket: Socket, next) => {
    try {
      // Extract token from handshake auth or headers
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret) as AuthUser;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // ─── Connection Lifecycle ───────────────────────────────────────────────────

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as AuthUser;

    // 1. Setup role-based rooms
    try {
      await RoomManager.setupUserRooms(socket, user);
    } catch (err) {
      console.error(`Error setting up rooms for user ${user.id}:`, err);
    }

    // 2. Track online presence
    PresenceManager.handleConnect(user.id, io);

    // If Admin connects, send initial presence count directly to that socket
    if (user.role === 'ADMIN') {
      socket.emit('presence:count', {
        onlineCount: PresenceManager.getOnlineCount(),
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Handle Disconnect
    socket.on('disconnect', () => {
      PresenceManager.handleDisconnect(user.id, io);
    });
  });

  return io;
}
