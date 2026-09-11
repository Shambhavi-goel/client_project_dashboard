import { Router } from 'express';
import { ProjectsController } from './projects.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createProjectSchema, updateProjectSchema } from './projects.schemas';
import { projectTasksRouter } from '../tasks/tasks.routes';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Nested tasks router
router.use('/:projectId/tasks', projectTasksRouter);

// List & view projects (scoped at service layer per role)
router.get('/', ProjectsController.getAll);
router.get('/:id', ProjectsController.getById);

// Create, update, delete projects (ADMIN or PM only)
router.post(
  '/',
  authorize(Role.ADMIN, Role.PM),
  validate({ body: createProjectSchema }),
  ProjectsController.create
);

router.put(
  '/:id',
  authorize(Role.ADMIN, Role.PM),
  validate({ body: updateProjectSchema }),
  ProjectsController.update
);

router.delete(
  '/:id',
  authorize(Role.ADMIN, Role.PM),
  ProjectsController.delete
);

export default router;
