import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters'),
  contactEmail: z.string().email('Invalid contact email address'),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
