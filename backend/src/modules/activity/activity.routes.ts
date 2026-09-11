import { Router } from 'express';
import { ActivityController } from './activity.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { activityFeedQuerySchema } from './activity.schemas';

const router = Router();

router.use(authenticate);

// Catch-up feed reading from DB, scoped by user role
router.get(
  '/feed',
  validate({ query: activityFeedQuerySchema }),
  ActivityController.getFeed
);

export default router;
