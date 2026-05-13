import { z } from 'zod';

export const indianPincodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Must be a valid 6-digit Indian pincode');

export const indianMobileSchema = z
  .string()
  .regex(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit Indian mobile number');

export const addressSchema = z.object({
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(50),
  pincode: indianPincodeSchema,
  landmark: z.string().max(200).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
