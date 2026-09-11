import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { loginSchema, registerSchema } from './auth.schemas';
import { Role } from '@prisma/client';

const router = Router();

// Public auth endpoints
router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Protected endpoints
router.get('/me', authenticate, AuthController.me);

// Admin-only user registration
router.post(
  '/register',
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: registerSchema }),
  AuthController.register
);

export default router;
