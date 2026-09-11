import { Router } from 'express';
import { TasksController } from './tasks.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  taskFilterSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './tasks.schemas';
import { Role } from '@prisma/client';

// ─── Direct Tasks Router (/api/tasks) ─────────────────────────────────────────

export const tasksRouter = Router();

tasksRouter.use(authenticate);

// Developer personal task list
tasksRouter.get(
  '/my',
  validate({ query: taskFilterSchema }),
  TasksController.getMyTasks
);

// Single task routes
tasksRouter.get('/:id', TasksController.getById);

tasksRouter.put(
  '/:id',
  authorize(Role.ADMIN, Role.PM),
  validate({ body: updateTaskSchema }),
  TasksController.update
);

tasksRouter.patch(
  '/:id/status',
  validate({ body: updateTaskStatusSchema }),
  TasksController.updateStatus
);

tasksRouter.delete(
  '/:id',
  authorize(Role.ADMIN, Role.PM),
  TasksController.delete
);

// ─── Nested Project Tasks Router (/api/projects/:projectId/tasks) ─────────────

export const projectTasksRouter = Router({ mergeParams: true });

projectTasksRouter.use(authenticate);

projectTasksRouter.get(
  '/',
  validate({ query: taskFilterSchema }),
  TasksController.getProjectTasks
);

projectTasksRouter.post(
  '/',
  authorize(Role.ADMIN, Role.PM),
  validate({ body: createTaskSchema }),
  TasksController.create
);
