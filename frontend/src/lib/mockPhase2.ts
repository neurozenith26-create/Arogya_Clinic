// Mock data and helpers for Phase 2 flows (bookings, slots, walk-in bills).
// Kept separate from mockData.ts so Phase 1 doesn't drag in this larger blob.

import type { MockDoctor, MockService } from './mockData';

// ─── In-memory mutable stores ────────────────────────────────────────────────

export interface MockSlot {
  time: string; // HH:MM
  available: boolean;
  reason?: 'booked' | 'blocked';
}

export interface MockBooking {
  id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  visit_type: 'in_clinic' | 'home_visit';
  patient_user_id: string | null;
  patient_snapshot: {
    first_name: string;
    last_name: string;
    mobile: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
  };
  doctor_user_id?: string;
  doctor_name?: string;
  doctor_speciality?: string;
  doctor_center?: string;
  items: Array<{
    item_name: string;
    item_type: 'doctor_consultation' | 'test' | 'package' | 'custom';
    unit_price: number;
    quantity: number;
  }>;
  scheduled_date: string;
  scheduled_start_time: string;
  delivery_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  subtotal_amount: number;
  home_visit_charge: number;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  booking_status:
    | 'draft'
    | 'pending_payment'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show';
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  collection_status:
    | 'not_required'
    | 'not_assigned'
    | 'assigned'
    | 'en_route'
    | 'collected'
    | 'received_at_lab';
  assigned_staff_name?: string;
  special_instructions?: string;
  reason_for_visit?: string;
  created_at: string;
  reports?: Array<{
    id: number;
    file_name: string;
    uploaded_at: string;
    report_type: string;
  }>;
}

let nextBookingId = 1;
let nextDocSeq = 1;
let nextTestSeq = 1;

function fmt(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}${mm}`;
}

export function generateBookingCode(type: 'doctor_appointment' | 'test_booking'): string {
  const yyyymm = fmt(new Date());
  if (type === 'doctor_appointment') {
    return `AROGYA-DOC-${yyyymm}-${String(nextDocSeq++).padStart(6, '0')}`;
  }
  return `AROGYA-TEST-${yyyymm}-${String(nextTestSeq++).padStart(6, '0')}`;
}

// Seed a few existing bookings so the patient dashboard + admin views look alive
export const mockBookings: MockBooking[] = [
  {
    id: nextBookingId++,
    booking_code: generateBookingCode('doctor_appointment'),
    booking_type: 'doctor_appointment',
    booking_origin: 'online',
    visit_type: 'in_clinic',
    patient_user_id: 'patient-demo',
    patient_snapshot: {
      first_name: 'Demo',
      last_name: 'Patient',
      mobile: '9999900000',
      email: 'demo@patient.test',
      date_of_birth: '1985-04-15',
      gender: 'M',
    },
    doctor_user_id: 'doc-001',
    doctor_name: 'Dr. A K Jain',
    doctor_speciality: 'Diabetologist & General Physician',
    doctor_center: 'Salt Lake',
    items: [
      {
        item_name: 'Consultation — Dr. A K Jain',
        item_type: 'doctor_consultation',
        unit_price: 700,
        quantity: 1,
      },
    ],
    scheduled_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    scheduled_start_time: '10:30',
    subtotal_amount: 700,
    home_visit_charge: 0,
    total_amount: 700,
    advance_amount: 350,
    balance_amount: 350,
    booking_status: 'confirmed',
    payment_status: 'partial',
    collection_status: 'not_required',
    reason_for_visit: 'Routine diabetes check-up',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: nextBookingId++,
    booking_code: generateBookingCode('test_booking'),
    booking_type: 'test_booking',
    booking_origin: 'online',
    visit_type: 'home_visit',
    patient_user_id: 'patient-demo',
    patient_snapshot: {
      first_name: 'Demo',
      last_name: 'Patient',
      mobile: '9999900000',
      email: 'demo@patient.test',
      date_of_birth: '1985-04-15',
      gender: 'M',
    },
    items: [
      { item_name: 'Complete Blood Count (CBC)', item_type: 'test', unit_price: 350, quantity: 1 },
      { item_name: 'Lipid Profile', item_type: 'test', unit_price: 750, quantity: 1 },
    ],
    scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    scheduled_start_time: '08:00',
    delivery_address: {
      line1: 'CD-85 Sector I',
      line2: 'Salt Lake City',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700064',
    },
    subtotal_amount: 1100,
    home_visit_charge: 150,
    total_amount: 1250,
    advance_amount: 625,
    balance_amount: 625,
    booking_status: 'confirmed',
    payment_status: 'partial',
    collection_status: 'assigned',
    assigned_staff_name: 'Rajesh (Lab Tech)',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: nextBookingId++,
    booking_code: generateBookingCode('test_booking'),
    booking_type: 'test_booking',
    booking_origin: 'walk_in',
    visit_type: 'in_clinic',
    patient_user_id: null,
    patient_snapshot: {
      first_name: 'Walk-in',
      last_name: 'Patient',
      mobile: '8888800000',
    },
    items: [
      { item_name: 'Digital X-Ray — Chest', item_type: 'test', unit_price: 400, quantity: 1 },
      { item_name: 'ECG', item_type: 'test', unit_price: 300, quantity: 1 },
    ],
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_start_time: '15:00',
    subtotal_amount: 700,
    home_visit_charge: 0,
    total_amount: 700,
    advance_amount: 700,
    balance_amount: 0,
    booking_status: 'completed',
    payment_status: 'paid',
    collection_status: 'not_required',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    reports: [
      {
        id: 1,
        file_name: 'CBC_Report_AROGYA-TEST.pdf',
        uploaded_at: new Date(Date.now() - 1800000).toISOString(),
        report_type: 'lab_report',
      },
    ],
  },
];

export function addBooking(booking: Omit<MockBooking, 'id'>): MockBooking {
  const next = { ...booking, id: nextBookingId++ };
  mockBookings.unshift(next);
  return next;
}

export function getBookingById(id: number): MockBooking | undefined {
  return mockBookings.find((b) => b.id === id);
}

export function getBookingByCode(code: string): MockBooking | undefined {
  return mockBookings.find((b) => b.booking_code === code);
}

export function updateBooking(id: number, patch: Partial<MockBooking>): MockBooking | undefined {
  const idx = mockBookings.findIndex((b) => b.id === id);
  if (idx === -1) return undefined;
  mockBookings[idx] = { ...mockBookings[idx], ...patch };
  return mockBookings[idx];
}

// ─── Slot generation for the booking wizards ─────────────────────────────────

export function generateDoctorSlots(_doctor: MockDoctor, date: string): MockSlot[] {
  // 09:00 to 13:00, 15-min slots, lunch 13:00 onwards
  const slots: MockSlot[] = [];
  const isPast = new Date(date) < new Date(new Date().toISOString().slice(0, 10));
  for (let h = 9; h < 13; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      // Random "booked" pattern just for the mock UI
      const seed = (h * 60 + m + date.length) % 7;
      const blocked = seed === 0 || seed === 3;
      slots.push({
        time,
        available: !isPast && !blocked,
        reason: isPast ? 'blocked' : blocked ? 'booked' : undefined,
      });
    }
  }
  return slots;
}

export function generateHomeCollectionSlots(date: string): MockSlot[] {
  const slots: MockSlot[] = [];
  const isPast = new Date(date) < new Date(new Date().toISOString().slice(0, 10));
  // 07:00–11:00, 30-min slots
  for (let h = 7; h < 11; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const full = (h * 2 + m / 30) % 6 === 0;
      slots.push({
        time,
        available: !isPast && !full,
        reason: full ? 'booked' : undefined,
      });
    }
  }
  return slots;
}

export function generateInClinicTestSlots(date: string): MockSlot[] {
  const slots: MockSlot[] = [];
  const isPast = new Date(date) < new Date(new Date().toISOString().slice(0, 10));
  // 09:00–18:00, 30-min slots
  for (let h = 9; h < 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const taken = (h + m) % 5 === 0;
      slots.push({
        time,
        available: !isPast && !taken,
        reason: taken ? 'booked' : undefined,
      });
    }
  }
  return slots;
}

// ─── Pincode serviceability (mock) ───────────────────────────────────────────

export interface PincodeCheckResult {
  serviceable: boolean;
  pincode: string;
  city?: string;
  state?: string;
  zone?: string;
  home_visit_charge?: number;
  lead_time_hours?: number;
}

const kolkataPincodes = new Set([
  '700001', '700016', '700019', '700020', '700026', '700029', '700039', '700040',
  '700053', '700055', '700064', '700075', '700091', '700102', '700156', '700157',
]);

export function checkPincode(pincode: string): PincodeCheckResult {
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return { serviceable: false, pincode };
  }
  if (kolkataPincodes.has(pincode)) {
    return {
      serviceable: true,
      pincode,
      city: 'Kolkata',
      state: 'West Bengal',
      zone: 'zone_a',
      home_visit_charge: 150,
      lead_time_hours: 4,
    };
  }
  return { serviceable: false, pincode, city: 'Kolkata', state: 'West Bengal' };
}

// ─── Helper to summarise a doctor or service into a booking line ─────────────

export function doctorConsultationItem(
  doctor: MockDoctor,
): MockBooking['items'][number] {
  return {
    item_name: `Consultation — ${doctor.display_name}`,
    item_type: 'doctor_consultation',
    unit_price: doctor.consultation_fee,
    quantity: 1,
  };
}

export function serviceItem(service: MockService, qty = 1): MockBooking['items'][number] {
  return {
    item_name: service.name,
    item_type: service.is_package ? 'package' : 'test',
    unit_price: service.price,
    quantity: qty,
  };
}
