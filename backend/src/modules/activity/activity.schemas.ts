import { z } from 'zod';

export const activityFeedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().uuid('Invalid project ID format').optional(),
});

export type ActivityFeedQuery = z.infer<typeof activityFeedQuerySchema>;
