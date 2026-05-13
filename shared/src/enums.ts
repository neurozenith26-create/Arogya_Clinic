export const USER_ROLES = ['patient', 'doctor', 'admin', 'super_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = ['receptionist', 'lab_tech', 'finance', 'admin', 'super_admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const GENDER = ['M', 'F', 'O'] as const;
export type Gender = (typeof GENDER)[number];

export const BOOKING_TYPE = ['doctor_appointment', 'test_booking'] as const;
export type BookingType = (typeof BOOKING_TYPE)[number];

export const BOOKING_ORIGIN = ['online', 'walk_in'] as const;
export type BookingOrigin = (typeof BOOKING_ORIGIN)[number];

export const VISIT_TYPE = ['in_clinic', 'home_visit'] as const;
export type VisitType = (typeof VISIT_TYPE)[number];

export const BOOKING_STATUS = [
  'draft',
  'pending_payment',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export const PAYMENT_STATUS_BOOKING = ['pending', 'partial', 'paid', 'refunded', 'failed'] as const;
export type PaymentStatusBooking = (typeof PAYMENT_STATUS_BOOKING)[number];

export const PAYMENT_SOURCE = ['razorpay', 'offline'] as const;
export type PaymentSource = (typeof PAYMENT_SOURCE)[number];

export const PAYMENT_METHOD_ONLINE = ['upi', 'card', 'netbanking', 'wallet', 'emi'] as const;
export const PAYMENT_METHOD_OFFLINE = ['cash', 'upi_qr_offline', 'card_swipe', 'cheque'] as const;
export type PaymentMethod =
  | (typeof PAYMENT_METHOD_ONLINE)[number]
  | (typeof PAYMENT_METHOD_OFFLINE)[number];

export const PAYMENT_RAZORPAY_STATUS = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
] as const;
export type PaymentRazorpayStatus = (typeof PAYMENT_RAZORPAY_STATUS)[number];

export const PAYMENT_TYPE = ['advance', 'balance', 'full'] as const;
export type PaymentType = (typeof PAYMENT_TYPE)[number];

export const BOOKING_ITEM_TYPE = [
  'doctor_consultation',
  'test',
  'package',
  'custom',
] as const;
export type BookingItemType = (typeof BOOKING_ITEM_TYPE)[number];

export const COLLECTION_STATUS = [
  'not_required',
  'not_assigned',
  'assigned',
  'en_route',
  'collected',
  'received_at_lab',
] as const;
export type CollectionStatus = (typeof COLLECTION_STATUS)[number];

export const REPORT_TYPE = ['lab_report', 'prescription', 'scan', 'other'] as const;
export type ReportType = (typeof REPORT_TYPE)[number];

export const REVIEW_STATUS = ['pending', 'approved', 'rejected', 'hidden'] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];

export const ENQUIRY_STATUS = ['new', 'read', 'replied', 'closed'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUS)[number];
