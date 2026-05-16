import type {
  BookingItemType,
  BookingOrigin,
  BookingStatus,
  BookingType,
  CollectionStatus,
  Gender,
  PaymentSource,
  PaymentStatusBooking,
  ReportType,
  UserRole,
  VisitType,
} from './enums';

export interface User {
  id: string;
  auth_user_id: string | null;
  role: UserRole;
  email: string | null;
  mobile: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_login_enabled: boolean;

  // Patient-specific
  date_of_birth?: string | null;
  gender?: Gender | null;
  default_address?: Address | null;
  emergency_contact?: EmergencyContact | null;
  alternative_number?: string | null;

  // Doctor-specific
  profile_photo_url?: string | null;
  department_id?: number | null;
  speciality?: string | null;
  qualifications?: string[] | null;
  consultation_fee?: number | null;
  about?: string | null;
  education_training?: string | null;
  is_verified?: boolean;
  offers_home_visit?: boolean;
  rating_avg?: number;
  rating_count?: number;

  // Admin-specific
  admin_role?: string | null;
  permissions?: Record<string, unknown> | null;

  // Multi-branch: non-null only for role='admin' (branch admin).
  // NULL for super_admin (sees all), patient, doctor.
  branch_id?: number | null;

  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: number;
  branch_code: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string | null;
  gstin: string | null;
  upi_id: string | null;
  upi_payee_name: string | null;
  business_hours: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  mobile: string;
}

export interface Department {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
  banner_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Service {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  test_key: string | null;
  price: number;
  short_description: string | null;
  full_details: string | null;
  prep_instructions: string | null;
  sample_type: string | null;
  report_turnaround_hours: number | null;
  image_url: string | null;
  is_package: boolean;
  package_service_ids: number[] | null;
  package_discount_percent: number | null;
  is_active: boolean;
}

export interface DoctorCenter {
  id: number;
  doctor_user_id: string;
  center_name: string;
  address: string;
  phone: string | null;
  map_link: string | null;
  city: string | null;
  pincode: string | null;
  consultation_fee_override: number | null;
  schedule: WeeklySchedule | null;
  home_visit_schedule: WeeklySchedule | null;
  is_active: boolean;
  branch_id: number | null;
}

export interface DailyScheduleSlot {
  start: string;
  end: string;
  slot_minutes: number;
  buffer_minutes?: number;
  lunch_start?: string | null;
  lunch_end?: string | null;
  max_bookings?: number;
}

export type WeeklySchedule = Partial<{
  sun: DailyScheduleSlot | null;
  mon: DailyScheduleSlot | null;
  tue: DailyScheduleSlot | null;
  wed: DailyScheduleSlot | null;
  thu: DailyScheduleSlot | null;
  fri: DailyScheduleSlot | null;
  sat: DailyScheduleSlot | null;
}>;

export interface Booking {
  id: number;
  booking_code: string;
  patient_user_id: string | null;
  booking_type: BookingType;
  booking_origin: BookingOrigin;
  visit_type: VisitType;
  doctor_user_id: string | null;
  doctor_center_id: number | null;
  delivery_address: Address | null;
  patient_snapshot: Record<string, unknown> | null;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  slot_locked_until: string | null;
  subtotal_amount: number;
  home_visit_charge: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatusBooking;
  reason_for_visit: string | null;
  special_instructions: string | null;
  admin_notes: string | null;
  assigned_staff_user_id: string | null;
  collection_status: CollectionStatus;
  created_by_user_id: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  branch_id: number;
  created_at: string;
  updated_at: string;
}

export interface BookingItem {
  id: number;
  booking_id: number;
  item_type: BookingItemType;
  service_id: number | null;
  doctor_user_id: string | null;
  item_name: string;
  item_description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ServiceablePincode {
  id: number;
  pincode: string;
  city: string | null;
  state: string | null;
  zone: string | null;
  home_visit_charge: number;
  collection_lead_time_hours: number;
  is_active: boolean;
  branch_id: number | null;
}

export interface Report {
  id: number;
  booking_id: number;
  patient_user_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  file_mime: string | null;
  report_type: ReportType;
  version: number;
  is_active: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface PaymentRecord {
  id: number;
  booking_id: number;
  payment_source: PaymentSource;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: string;
  payment_type: string;
  collected_by_user_id: string | null;
  captured_at: string | null;
  failure_reason: string | null;
  refunded_amount: number;
  razorpay_refund_id: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  notes: string | null;
}

export interface Invoice {
  id: number;
  booking_id: number;
  invoice_number: string;
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  gstin: string | null;
  pdf_url: string | null;
  generated_at: string;
  sent_to_patient_at: string | null;
}
