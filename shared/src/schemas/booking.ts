import { z } from 'zod';
import { addressSchema, indianMobileSchema } from './address';
import { GENDER } from '../enums';

export const patientInfoSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(1).max(100),
  mobile: indianMobileSchema,
  email: z.string().email().optional().or(z.literal('')),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  gender: z.enum(GENDER),
  alternative_number: indianMobileSchema.optional().or(z.literal('')),
});

export const doctorAppointmentBookingSchema = z.object({
  doctor_id: z.string().uuid(),
  doctor_center_id: z.number().int().positive(),
  visit_type: z.enum(['in_clinic', 'home_visit']),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  patient_info: patientInfoSchema,
  reason_for_visit: z.string().max(2000).optional(),
  special_instructions: z.string().max(2000).optional(),
  delivery_address: addressSchema.optional(),
});

export type DoctorAppointmentBookingInput = z.infer<typeof doctorAppointmentBookingSchema>;

export const testCartItemSchema = z.object({
  service_id: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

export const testBookingSchema = z.object({
  items: z.array(testCartItemSchema).min(1, 'Add at least one test'),
  visit_type: z.enum(['in_clinic', 'home_visit']),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  patient_info: patientInfoSchema,
  delivery_address: addressSchema.optional(),
  special_instructions: z.string().max(2000).optional(),
}).refine(
  (d) => d.visit_type === 'in_clinic' || !!d.delivery_address,
  { message: 'delivery_address is required for home_visit', path: ['delivery_address'] },
);

export type TestBookingInput = z.infer<typeof testBookingSchema>;
