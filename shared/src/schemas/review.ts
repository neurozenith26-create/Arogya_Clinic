import { z } from 'zod';

export const reviewSchema = z.object({
  doctor_id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, 'Comment is too short').max(2000),
  guest_name: z.string().min(2).max(100).optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
