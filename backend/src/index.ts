import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler, NotFoundError } from './middleware/errorHandler';
import { setupSocketIO } from './sockets/socket';
import { SocketEmitters } from './sockets/emitters';
import { setTaskStatusChangeHook, setTaskCreatedHook } from './modules/tasks/tasks.service';
import { startOverdueScanner } from './jobs/overdueScanner';
import prisma from './lib/prisma';
import { NotificationType, TaskStatus } from '@prisma/client';

// Route modules
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import clientsRoutes from './modules/clients/clients.routes';
import projectsRoutes from './modules/projects/projects.routes';
import { tasksRouter } from './modules/tasks/tasks.routes';
import activityRoutes from './modules/activity/activity.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import { NotificationsService } from './modules/notifications/notifications.service';

const app = express();
const httpServer = createServer(app);

// ─── Initialize Socket.io ─────────────────────────────────────────────────────

export const io = setupSocketIO(httpServer);

// ─── Core Middleware ──────────────────────────────────────────────────────────

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow all Vercel domains, localhost, and configured frontend URL
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── Health Check & Auto-Setup ────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/setup/seed', async (_req, res, next) => {
  try {
    const { seedDatabase } = await import('../prisma/seed');
    await seedDatabase(prisma);
    res.json({ success: true, message: 'Database seeded successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRouter);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationsRoutes);

// ─── Wire Task Lifecycle Hooks to Sockets & Notifications ─────────────────────

setTaskStatusChangeHook(async ({ task, activityLog, user }) => {
  // 1. Emit live activity event to scoped rooms
  SocketEmitters.emitActivityNew(activityLog, task);

  // 2. If moved to IN_REVIEW: notify owning PM in real time
  if (task.status === TaskStatus.IN_REVIEW && task.project?.createdById) {
    try {
      const pmId = task.project.createdById;
      await NotificationsService.createAndPush(
        pmId,
        NotificationType.TASK_IN_REVIEW,
        `"${task.title}" has been moved to In Review by ${user.name}`,
        task.id
      );
    } catch (err) {
      console.error('Error sending IN_REVIEW notification to PM:', err);
    }
  }
});

setTaskCreatedHook(async ({ task, user }) => {
  // Notify assigned developer upon assignment in real time
  if (task.assignedDeveloperId) {
    try {
      await NotificationsService.createAndPush(
        task.assignedDeveloperId,
        NotificationType.TASK_ASSIGNED,
        `${user.name} assigned you to "${task.title}"`,
        task.id
      );
    } catch (err) {
      console.error('Error sending TASK_ASSIGNED notification:', err);
    }
  }
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

// ─── Centralized Error Handler ────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Background Cron Jobs ───────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  startOverdueScanner();
}

// ─── Auto-Seed on Startup if Database is Empty ───────────────────────────────

async function ensureDatabaseReady() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Database is empty. Running automatic seed on startup...');
      const { seedDatabase } = await import('../prisma/seed');
      await seedDatabase(prisma);
      console.log('✅ Automatic seed completed successfully!');
    }
  } catch (err) {
    console.warn('⚠️ Database check warning on startup:', (err as Error).message);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  ensureDatabaseReady().then(() => {
    httpServer.listen(config.port, () => {
      console.log(`\n🚀 Server running on http://localhost:${config.port}`);
      console.log(`📡 Environment: ${config.nodeEnv}`);
      console.log(`🔒 CORS Origin: ${config.frontendUrl}`);
      console.log(`⚡ Socket.io listening on port ${config.port}\n`);
    });
  });
}

export { app, httpServer };
