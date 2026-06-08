import { z } from 'zod';

export const addServiceSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  duration_minutes: z
    .number()
    .int()
    .min(5, 'minimum duration is 5 minutes')
    .max(480, 'maximum duration is 480 minutes'),
  price: z
    .number()
    .min(0, 'price must be non-negative')
    .default(0),
  currency: z.string().min(1).max(10).default('HNL'),
});

export const updateServiceSchema = addServiceSchema;

export type AddServiceInput = z.infer<typeof addServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
