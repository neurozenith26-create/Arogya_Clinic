import { z } from 'zod';
import { indianMobileSchema } from './address';

export const enquirySchema = z.object({
  name: z.string().min(2, 'Please enter your name').max(200),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: indianMobileSchema.optional().or(z.literal('')),
  subject: z.string().min(2).max(255).optional().or(z.literal('')),
  message: z.string().min(5, 'Please write a brief message').max(5000),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
