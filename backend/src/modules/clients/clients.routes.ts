import { Router } from 'express';
import { ClientsController } from './clients.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createClientSchema, updateClientSchema } from './clients.schemas';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List & view clients: ADMIN and PM
router.get('/', authorize(Role.ADMIN, Role.PM), ClientsController.getAll);
router.get('/:id', authorize(Role.ADMIN, Role.PM), ClientsController.getById);

// Create, update, delete clients: ADMIN only
router.post(
  '/',
  authorize(Role.ADMIN),
  validate({ body: createClientSchema }),
  ClientsController.create
);

router.put(
  '/:id',
  authorize(Role.ADMIN),
  validate({ body: updateClientSchema }),
  ClientsController.update
);

router.delete(
  '/:id',
  authorize(Role.ADMIN),
  ClientsController.delete
);

export default router;
