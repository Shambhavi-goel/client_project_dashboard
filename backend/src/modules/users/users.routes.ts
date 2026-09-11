import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', UsersController.getAll);
router.get('/:id', UsersController.getById);

export default router;
