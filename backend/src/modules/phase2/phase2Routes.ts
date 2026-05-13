import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { query, transaction } from '../../db/pool.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router: ExpressRouter = Router();

// ─── Payment-proof uploads (multipart for /bookings/{test,doctor-appointment}) ──
const PROOF_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const PROOF_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROOF_MAX_SIZE },
});

// (Auth signup/login moved to authRoutes.ts — this module now handles bookings,
// slots, payments, reports, and admin operations.)

const profileUpdateSchema = z.object({
  first_name: z.string().min(2).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  default_address: z.record(z.unknown()).optional(),
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const data = profileUpdateSchema.parse(req.body);
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (fields.length === 0) {
      res.json({ data: { updated: false } });
      return;
    }
    const set = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => (typeof v === 'object' ? JSON.stringify(v) : v));
    await query(`UPDATE users SET ${set}, updated_at = NOW() WHERE id = $1`, [req.user!.id, ...values]);
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: serviceable pincodes CRUD ──────────────────────────────────────

const pincodeCreateSchema = z.object({
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Must be a 6-digit Indian pincode'),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(50).nullable().optional(),
  zone: z.string().trim().max(50).nullable().optional(),
  home_visit_charge: z.number().nonnegative().default(0),
  collection_lead_time_hours: z.number().int().nonnegative().default(4),
  is_active: z.boolean().optional(),
});
const pincodeUpdateSchema = pincodeCreateSchema.partial();

router.get('/admin/serviceable-pincodes', requireAuth, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, pincode, city, state, zone, home_visit_charge,
              collection_lead_time_hours, is_active, created_at, updated_at
       FROM serviceable_pincodes
       ORDER BY pincode`,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/serviceable-pincodes', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = pincodeCreateSchema.parse(req.body);
    // pincode is UNIQUE — pre-check so we return a friendly 409 instead of
    // letting pg's 23505 surface.
    const dup = await query<{ id: number }>(
      `SELECT id FROM serviceable_pincodes WHERE pincode = $1`,
      [data.pincode],
    );
    if (dup.rows.length > 0) {
      throw new HttpError(
        409,
        `Pincode ${data.pincode} is already in the serviceable list.`,
        'DUPLICATE_PINCODE',
      );
    }
    const result = await query<{ id: number }>(
      `INSERT INTO serviceable_pincodes
         (pincode, city, state, zone, home_visit_charge, collection_lead_time_hours, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
       RETURNING id`,
      [
        data.pincode,
        data.city ?? null,
        data.state ?? null,
        data.zone ?? null,
        data.home_visit_charge,
        data.collection_lead_time_hours,
        data.is_active ?? null,
      ],
    );
    res.status(201).json({ data: { id: result.rows[0].id } });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/serviceable-pincodes/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = pincodeUpdateSchema.parse(req.body);
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      res.json({ data: { updated: false } });
      return;
    }
    const set = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = entries.map(([, v]) => v);
    const result = await query<{ id: number }>(
      `UPDATE serviceable_pincodes SET ${set}, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id, ...values],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Pincode not found', 'NOT_FOUND');
    }
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/serviceable-pincodes/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    // Soft delete (is_active=FALSE) so the patient pincode-check endpoint
    // stops returning it without affecting historical bookings.
    const result = await query<{ id: number }>(
      `UPDATE serviceable_pincodes SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Pincode not found', 'NOT_FOUND');
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Pincode serviceability ────────────────────────────────────────────────

router.get('/serviceable-pincodes/check', async (req, res, next) => {
  try {
    const pincode = String(req.query.pincode ?? '');
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      res.json({ data: { serviceable: false, pincode } });
      return;
    }
    const result = await query(
      `SELECT pincode, city, state, zone, home_visit_charge, collection_lead_time_hours
       FROM serviceable_pincodes
       WHERE pincode = $1 AND is_active = TRUE`,
      [pincode],
    );
    if (result.rows.length === 0) {
      res.json({ data: { serviceable: false, pincode } });
      return;
    }
    res.json({ data: { serviceable: true, ...result.rows[0] } });
  } catch (err) {
    next(err);
  }
});

// ─── Slots ──────────────────────────────────────────────────────────────────

// ─── Slot generation helpers ───────────────────────────────────────────────
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

interface DailySchedule {
  start: string;
  end: string;
  slot_minutes: number;
  buffer_minutes?: number;
  lunch_start?: string | null;
  lunch_end?: string | null;
  max_bookings?: number;
}
type WeeklySchedule = Partial<Record<WeekdayKey, DailySchedule | null>>;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function isoWeekday(yyyymmdd: string): WeekdayKey {
  // Parse as a calendar date in Asia/Kolkata-ish semantics — for slot purposes
  // a YYYY-MM-DD has a well-defined weekday independent of timezone.
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_KEYS[date.getUTCDay()];
}

function buildCandidateSlots(schedule: DailySchedule): string[] {
  const slots: string[] = [];
  const startM = timeToMinutes(schedule.start);
  const endM = timeToMinutes(schedule.end);
  const step = schedule.slot_minutes + (schedule.buffer_minutes ?? 0);
  if (step <= 0) return slots;
  const lunchStart =
    schedule.lunch_start != null ? timeToMinutes(schedule.lunch_start) : null;
  const lunchEnd =
    schedule.lunch_end != null ? timeToMinutes(schedule.lunch_end) : null;
  for (let t = startM; t + schedule.slot_minutes <= endM; t += step) {
    // Skip any slot that overlaps the lunch window
    if (lunchStart !== null && lunchEnd !== null) {
      const slotEnd = t + schedule.slot_minutes;
      if (slotEnd > lunchStart && t < lunchEnd) continue;
    }
    slots.push(minutesToTime(t));
  }
  return slots;
}

router.get('/doctors/:id/slots', async (req, res, next) => {
  try {
    const date = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, 'date param required as YYYY-MM-DD', 'BAD_REQUEST');
    }
    const centerIdParam = req.query.center_id ? Number(req.query.center_id) : undefined;
    const visitType = req.query.visit_type === 'home_visit' ? 'home_visit' : 'in_clinic';

    // Pick the requested center, or the first active center if none specified.
    const centerRes = await query<{
      id: number;
      schedule: WeeklySchedule | null;
      home_visit_schedule: WeeklySchedule | null;
    }>(
      centerIdParam
        ? `SELECT id, schedule, home_visit_schedule FROM doctor_centers
           WHERE id = $1 AND doctor_user_id = $2 AND is_active = TRUE`
        : `SELECT id, schedule, home_visit_schedule FROM doctor_centers
           WHERE doctor_user_id = $1 AND is_active = TRUE
           ORDER BY id LIMIT 1`,
      centerIdParam ? [centerIdParam, req.params.id] : [req.params.id],
    );
    const center = centerRes.rows[0];
    if (!center) {
      res.json({ data: { date, slots: [] } });
      return;
    }

    const weekly = visitType === 'home_visit' ? center.home_visit_schedule : center.schedule;
    const daily = weekly?.[isoWeekday(date)] ?? null;
    if (!daily) {
      res.json({ data: { date, slots: [] } });
      return;
    }
    const candidates = buildCandidateSlots(daily);

    // Existing bookings for this doctor on this date in slot-blocking statuses.
    const bookedRes = await query<{ scheduled_start_time: string }>(
      `SELECT scheduled_start_time::text AS scheduled_start_time FROM bookings
       WHERE doctor_user_id = $1
         AND scheduled_date = $2
         AND booking_status IN ('draft', 'pending_payment', 'confirmed', 'in_progress')`,
      [req.params.id, date],
    );
    const bookedSet = new Set(bookedRes.rows.map((r) => r.scheduled_start_time.slice(0, 5)));

    // Doctor-level unavailability windows for the date.
    const unavailRes = await query<{ slot_start_time: string | null; slot_end_time: string | null }>(
      `SELECT slot_start_time::text AS slot_start_time, slot_end_time::text AS slot_end_time
       FROM doctor_unavailability
       WHERE doctor_user_id = $1
         AND unavailable_date = $2
         AND (doctor_center_id IS NULL OR doctor_center_id = $3)`,
      [req.params.id, date, center.id],
    );
    const wholeDayBlocked = unavailRes.rows.some((r) => r.slot_start_time === null);
    if (wholeDayBlocked) {
      res.json({ data: { date, slots: [] } });
      return;
    }
    const blockedWindows = unavailRes.rows
      .filter((r) => r.slot_start_time && r.slot_end_time)
      .map((r) => ({
        start: timeToMinutes(r.slot_start_time!.slice(0, 5)),
        end: timeToMinutes(r.slot_end_time!.slice(0, 5)),
      }));

    const slots = candidates.map((time) => {
      const minute = timeToMinutes(time);
      const isBooked = bookedSet.has(time);
      const isBlocked = blockedWindows.some(
        (w) => minute + daily.slot_minutes > w.start && minute < w.end,
      );
      const available = !isBooked && !isBlocked;
      return {
        time,
        available,
        ...(isBooked ? { reason: 'booked' as const } : {}),
        ...(isBlocked ? { reason: 'blocked' as const } : {}),
      };
    });

    res.json({ data: { date, center_id: center.id, visit_type: visitType, slots } });
  } catch (err) {
    next(err);
  }
});

router.get('/home-collection/slots', async (req, res, next) => {
  try {
    const date = String(req.query.date ?? '');
    const pincode = String(req.query.pincode ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, 'date param required', 'BAD_REQUEST');
    }
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      throw new HttpError(400, 'pincode param required', 'BAD_REQUEST');
    }
    res.json({
      data: {
        date,
        pincode,
        slots: Array.from({ length: 8 }, (_, i) => {
          const h = 7 + Math.floor(i / 2);
          const m = (i % 2) * 30;
          return {
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            available: i % 4 !== 0,
          };
        }),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Bookings ───────────────────────────────────────────────────────────────

const doctorBookingSchema = z.object({
  doctor_id: z.string().uuid(),
  // pg returns BIGSERIAL ids as strings (BIGINT can exceed JS Number range).
  // Accept either string or number on the wire — coerce here at the boundary.
  doctor_center_id: z.coerce.number().int().positive(),
  visit_type: z.enum(['in_clinic', 'home_visit']),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  patient_snapshot: z.record(z.unknown()),
  reason_for_visit: z.string().optional(),
  upi_reference: z.string().max(100).optional(),
});

/**
 * Parse the multipart `data` field as JSON. Patients submit FormData with
 * `payment_proof` (file) + `data` (JSON-stringified booking payload) +
 * optional `upi_reference`. We do this here instead of letting Zod parse
 * a flat req.body because nested objects (patient_snapshot, items, etc.)
 * survive intact when JSON-encoded, whereas multipart text fields lose
 * structure.
 */
function parseMultipartData(req: { body: Record<string, unknown> }): Record<string, unknown> {
  const raw = req.body?.data;
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new HttpError(400, 'Missing `data` field in multipart body', 'BAD_REQUEST');
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Pass `upi_reference` through if it was sent as a sibling text field
    if (typeof req.body.upi_reference === 'string' && !parsed.upi_reference) {
      parsed.upi_reference = req.body.upi_reference;
    }
    return parsed;
  } catch {
    throw new HttpError(400, 'Invalid JSON in `data` field', 'BAD_REQUEST');
  }
}

function validateProofFile(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) {
    throw new HttpError(400, 'Payment proof required', 'PROOF_REQUIRED');
  }
  if (!PROOF_ALLOWED_MIME.has(file.mimetype)) {
    throw new HttpError(
      400,
      'Proof must be JPG, PNG, WEBP image or PDF',
      'UNSUPPORTED_MEDIA',
    );
  }
  return file;
}

router.post(
  '/bookings/doctor-appointment',
  requireAuth,
  requireRole('patient'),
  proofUpload.single('payment_proof'),
  async (req, res, next) => {
    try {
      const data = doctorBookingSchema.parse(parseMultipartData(req));
      const proof = validateProofFile(req.file);

      const booking = await transaction(async (client) => {
        const consultFeeRes = await client.query<{ consultation_fee: number }>(
          'SELECT consultation_fee FROM users WHERE id = $1 AND role = $2',
          [data.doctor_id, 'doctor'],
        );
        if (consultFeeRes.rows.length === 0)
          throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
        const fee = Number(consultFeeRes.rows[0].consultation_fee);

        // Two-stage UPI-manual flow (see migration 0024):
        // 1) Patient uploads proof → booking is INSTANTLY confirmed, payments
        //    row created with payment_status='captured', verified_at=NULL.
        // 2) Admin re-verifies at sample-collection / clinic-visit time via
        //    POST /admin/payments/:id/re-verify (fills verified_at).
        // 50% advance = round(total / 2); patient also sees a "Balance due"
        // line for the remainder.
        const advance = Math.round(fee / 2);
        const balance = fee - advance;
        const paymentStatus = advance >= fee ? 'paid' : 'partial';

        const bookingRes = await client.query<{ id: number; booking_code: string }>(
          `INSERT INTO bookings (
            patient_user_id, booking_type, booking_origin, visit_type,
            doctor_user_id, doctor_center_id,
            scheduled_date, scheduled_start_time,
            patient_snapshot,
            subtotal_amount, total_amount, advance_amount, balance_amount,
            booking_status, payment_status, reason_for_visit, created_by_user_id
          ) VALUES (
            $1, 'doctor_appointment', 'online', $2,
            $3, $4, $5, $6, $7,
            $8, $8, $9, $10,
            'confirmed', $11, $12, $1
          ) RETURNING id, booking_code`,
          [
            req.user!.id,
            data.visit_type,
            data.doctor_id,
            data.doctor_center_id,
            data.scheduled_date,
            data.scheduled_start_time,
            JSON.stringify(data.patient_snapshot),
            fee,
            advance,
            balance,
            paymentStatus,
            data.reason_for_visit ?? null,
          ],
        );

        await client.query(
          `INSERT INTO booking_items (booking_id, item_type, doctor_user_id, item_name, quantity, unit_price, total_price)
           VALUES ($1, 'doctor_consultation', $2, $3, 1, $4, $4)`,
          [bookingRes.rows[0].id, data.doctor_id, 'Doctor consultation', fee],
        );

        // Auto-generate an invoice row so the admin's invoice list and the
        // patient's "Download Invoice" button work the moment the booking
        // is created. The trigger fills invoice_number.
        await client.query(
          `INSERT INTO invoices (booking_id, subtotal_amount, tax_amount, discount_amount, total_amount, invoice_number)
           VALUES ($1, $2, 0, 0, $2, '')`,
          [bookingRes.rows[0].id, fee],
        );

        // payments row carries the BYTEA proof; verified_at remains NULL
        // until the in-person admin re-verify step (see plan).
        const paymentRes = await client.query<{ id: number }>(
          `INSERT INTO payments
             (booking_id, payment_source, amount, currency,
              payment_method, payment_status, payment_type,
              payment_proof_bytes, payment_proof_mime, upi_reference,
              captured_at)
           VALUES ($1, 'upi_manual', $2, 'INR',
                   'upi_qr_offline', 'captured', 'advance',
                   $3, $4, $5, NOW())
           RETURNING id`,
          [
            bookingRes.rows[0].id,
            advance,
            proof.buffer,
            proof.mimetype,
            data.upi_reference ?? null,
          ],
        );

        return { ...bookingRes.rows[0], payment_id: paymentRes.rows[0].id };
      });
      res.status(201).json({ data: booking });
    } catch (err) {
      next(err);
    }
  },
);

const testBookingSchema = z.object({
  // pg returns BIGSERIAL ids and NUMERIC columns as strings. Coerce both so
  // the patient cart can forward whatever GET /services gave it (cart items
  // carry service_id as the raw value from the catalog endpoint).
  items: z
    .array(
      z.object({
        service_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
  visit_type: z.enum(['in_clinic', 'home_visit']),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  patient_snapshot: z.record(z.unknown()),
  delivery_address: z.record(z.unknown()).optional(),
  home_visit_charge: z.coerce.number().nonnegative().default(0),
  special_instructions: z.string().optional(),
  upi_reference: z.string().max(100).optional(),
});

router.post(
  '/bookings/test',
  requireAuth,
  requireRole('patient'),
  proofUpload.single('payment_proof'),
  async (req, res, next) => {
    try {
      const data = testBookingSchema.parse(parseMultipartData(req));
      const proof = validateProofFile(req.file);

      const booking = await transaction(async (client) => {
        const ids = data.items.map((i) => i.service_id);
        // services.id is BIGSERIAL — pg returns it as a string. Use `string` in
        // the row type so the `===` lookup below compares like-for-like.
        const svcRes = await client.query<{
          id: string;
          name: string;
          price: string;
          is_package: boolean;
        }>(
          `SELECT id, name, price, is_package FROM services WHERE id = ANY($1::bigint[]) AND is_active = TRUE`,
          [ids],
        );

        let subtotal = 0;
        const itemRows = data.items.map((i) => {
          // Compare via Number() because data.items.service_id was Zod-coerced
          // to a number while svc.id stays a string from pg.
          const svc = svcRes.rows.find((s) => Number(s.id) === i.service_id);
          if (!svc) throw new HttpError(404, `Service ${i.service_id} not found`, 'NOT_FOUND');
          const price = Number(svc.price);
          subtotal += price * i.quantity;
          return { ...i, name: svc.name, price, is_package: svc.is_package };
        });

        const total = subtotal + data.home_visit_charge;

        // Two-stage UPI-manual flow (see migration 0024): proof upload =
        // instant confirm; admin re-verifies in person at sample-collection
        // time. 50% advance pre-filled because the patient just paid it.
        const advance = Math.round(total / 2);
        const balance = total - advance;
        const paymentStatus = advance >= total ? 'paid' : 'partial';

        const bookingRes = await client.query<{ id: number; booking_code: string }>(
          `INSERT INTO bookings (
            patient_user_id, booking_type, booking_origin, visit_type,
            scheduled_date, scheduled_start_time,
            patient_snapshot, delivery_address,
            subtotal_amount, home_visit_charge, total_amount, advance_amount, balance_amount,
            booking_status, payment_status, special_instructions,
            collection_status, created_by_user_id
          ) VALUES (
            $1, 'test_booking', 'online', $2,
            $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            'confirmed', $12, $13,
            $14, $1
          ) RETURNING id, booking_code`,
          [
            req.user!.id,
            data.visit_type,
            data.scheduled_date,
            data.scheduled_start_time,
            JSON.stringify(data.patient_snapshot),
            data.delivery_address ? JSON.stringify(data.delivery_address) : null,
            subtotal,
            data.home_visit_charge,
            total,
            advance,
            balance,
            paymentStatus,
            data.special_instructions ?? null,
            data.visit_type === 'home_visit' ? 'not_assigned' : 'not_required',
          ],
        );

        for (const item of itemRows) {
          await client.query(
            `INSERT INTO booking_items (booking_id, item_type, service_id, item_name, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              bookingRes.rows[0].id,
              item.is_package ? 'package' : 'test',
              item.service_id,
              item.name,
              item.quantity,
              item.price,
              item.price * item.quantity,
            ],
          );
        }

        // Auto-generate the invoice row — same as the walk-in flow does — so
        // every booking (walk-in, doctor appt, online test) has an invoice
        // available the moment it's created.
        await client.query(
          `INSERT INTO invoices (booking_id, subtotal_amount, tax_amount, discount_amount, total_amount, invoice_number)
           VALUES ($1, $2, 0, 0, $3, '')`,
          [bookingRes.rows[0].id, subtotal, total],
        );

        const paymentRes = await client.query<{ id: number }>(
          `INSERT INTO payments
             (booking_id, payment_source, amount, currency,
              payment_method, payment_status, payment_type,
              payment_proof_bytes, payment_proof_mime, upi_reference,
              captured_at)
           VALUES ($1, 'upi_manual', $2, 'INR',
                   'upi_qr_offline', 'captured', 'advance',
                   $3, $4, $5, NOW())
           RETURNING id`,
          [
            bookingRes.rows[0].id,
            advance,
            proof.buffer,
            proof.mimetype,
            data.upi_reference ?? null,
          ],
        );

        return { ...bookingRes.rows[0], payment_id: paymentRes.rows[0].id };
      });
      res.status(201).json({ data: booking });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * STUB for the Razorpay payment-confirmation step. Until the real Razorpay
 * integration is wired (signature-verified webhook on
 * `POST /webhooks/razorpay`), this endpoint stands in for it from the
 * patient's PaymentCallbackPage. It transactionally:
 *   - locks the bookings row (FOR UPDATE)
 *   - bumps `advance_amount` to round(total_amount / 2)
 *   - drops `balance_amount` to `total - advance`
 *   - flips `booking_status: pending_payment → confirmed`
 *   - flips `payment_status: pending → partial` (or `paid` if total <= 0)
 *   - INSERTs a `payments` row marked `payment_source='razorpay'`,
 *     `payment_status='captured'`, `payment_method='upi'`, with a mock
 *     `razorpay_order_id` so the admin payment ledger reflects the booking.
 *
 * Idempotent — if the booking is already `confirmed` (or further along), the
 * endpoint returns the current state without double-charging or duplicating
 * the payments row.
 *
 * REMOVE THIS HANDLER once `POST /webhooks/razorpay` is implemented for
 * real and the patient flow opens Razorpay Checkout directly.
 */
router.post('/bookings/:id/confirm-payment-stub', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId)) {
      throw new HttpError(400, 'Invalid booking id', 'BAD_REQUEST');
    }
    const updated = await transaction(async (client) => {
      const bookingRes = await client.query<{
        id: number;
        booking_code: string;
        total_amount: string;
        booking_status: string;
        payment_status: string;
      }>(
        `SELECT id, booking_code, total_amount, booking_status, payment_status
         FROM bookings
         WHERE id = $1 AND patient_user_id = $2
         FOR UPDATE`,
        [bookingId, req.user!.id],
      );
      if (bookingRes.rows.length === 0) {
        throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
      }
      const b = bookingRes.rows[0];

      // Idempotent: if already confirmed (or beyond pending_payment), do nothing.
      if (b.booking_status !== 'pending_payment') {
        return b;
      }

      const total = Number(b.total_amount);
      const advance = Math.round(total / 2);
      const balance = total - advance;
      const newPaymentStatus = total <= 0 ? 'paid' : advance >= total ? 'paid' : 'partial';
      // For free/₹0 bookings (e.g. seed price = 0), skip Confirmation as paid.
      const newBookingStatus = 'confirmed';

      await client.query(
        `UPDATE bookings
            SET advance_amount = $1,
                balance_amount = $2,
                booking_status = $3,
                payment_status = $4,
                updated_at = NOW()
          WHERE id = $5`,
        [advance, balance, newBookingStatus, newPaymentStatus, bookingId],
      );

      // Only record an actual payment if money changed hands (advance > 0).
      // ₹0 bookings still confirm but don't get a phantom payments row.
      if (advance > 0) {
        const mockOrderId = `order_mock_${bookingId}_${Date.now()}`;
        await client.query(
          `INSERT INTO payments
             (booking_id, payment_source, razorpay_order_id, amount, currency,
              payment_method, payment_status, payment_type, captured_at, notes)
           VALUES ($1, 'razorpay', $2, $3, 'INR', 'upi', 'captured', 'advance', NOW(),
                   'Auto-confirmed via stub endpoint — replace with real Razorpay webhook before launch.')`,
          [bookingId, mockOrderId, advance],
        );
      }
      return {
        ...b,
        booking_status: newBookingStatus,
        payment_status: newPaymentStatus,
      };
    });
    res.json({ data: { id: updated.id, booking_code: updated.booking_code, booking_status: updated.booking_status, payment_status: updated.payment_status } });
  } catch (err) {
    next(err);
  }
});

router.get('/bookings', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.id, b.booking_code, b.booking_type, b.booking_origin, b.visit_type,
              b.scheduled_date, b.scheduled_start_time,
              b.total_amount, b.advance_amount, b.balance_amount,
              b.booking_status, b.payment_status, b.collection_status,
              b.doctor_user_id, b.created_at,
              (SELECT first_name || ' ' || COALESCE(last_name,'') FROM users WHERE id = b.doctor_user_id) AS doctor_name,
              (SELECT speciality FROM users WHERE id = b.doctor_user_id) AS doctor_speciality,
              (SELECT center_name FROM doctor_centers WHERE id = b.doctor_center_id) AS doctor_center,
              (SELECT string_agg(item_name, ', ' ORDER BY id) FROM booking_items WHERE booking_id = b.id) AS items_summary,
              (SELECT COUNT(*) FROM reports WHERE booking_id = b.id AND is_active = TRUE)::int AS reports_count
       FROM bookings b
       WHERE b.patient_user_id = $1
       ORDER BY b.scheduled_date DESC NULLS LAST, b.scheduled_start_time DESC NULLS LAST, b.created_at DESC`,
      [req.user!.id],
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/bookings/:id', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const bookingRes = await query(
      `SELECT b.*,
              (SELECT first_name || ' ' || COALESCE(last_name,'') FROM users WHERE id = b.doctor_user_id) AS doctor_name,
              (SELECT speciality FROM users WHERE id = b.doctor_user_id) AS doctor_speciality,
              (SELECT center_name FROM doctor_centers WHERE id = b.doctor_center_id) AS doctor_center
       FROM bookings b
       WHERE b.id = $1 AND b.patient_user_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (bookingRes.rows.length === 0) throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
    const items = await query('SELECT * FROM booking_items WHERE booking_id = $1 ORDER BY id', [req.params.id]);
    const reports = await query(
      `SELECT id, file_name, file_url, file_mime, report_type, version, uploaded_at
       FROM reports WHERE booking_id = $1 AND is_active = TRUE ORDER BY version DESC`,
      [req.params.id],
    );
    // Manual-UPI proof rows — patient gets the streaming URL, not the bytes.
    // We also surface `verified_at` so the patient sees "Re-verified by clinic
    // on …" once admin has done the in-person re-verify step.
    const payments = await query(
      `SELECT id, payment_source, amount, payment_status, payment_type,
              payment_method, captured_at, upi_reference, verified_at,
              payment_proof_mime,
              CASE WHEN payment_proof_bytes IS NOT NULL
                   THEN '/api/v1/payments/' || id || '/proof'
                   ELSE NULL END AS proof_url
         FROM payments
        WHERE booking_id = $1
        ORDER BY created_at`,
      [req.params.id],
    );
    res.json({
      data: {
        ...bookingRes.rows[0],
        items: items.rows,
        reports: reports.rows,
        payments: payments.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/bookings/:id/cancel', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE bookings SET booking_status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1
       WHERE id = $2 AND patient_user_id = $3
       RETURNING id`,
      [req.body.reason ?? null, req.params.id, req.user!.id],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
    res.json({ data: { cancelled: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Reports ────────────────────────────────────────────────────────────────

router.get('/reports', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.id, r.file_name, r.uploaded_at, r.report_type, r.booking_id,
              b.booking_code
       FROM reports r JOIN bookings b ON b.id = r.booking_id
       WHERE r.patient_user_id = $1 AND r.is_active = TRUE
       ORDER BY r.uploaded_at DESC`,
      [req.user!.id],
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/:id/download', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT file_url FROM reports
       WHERE id = $1 AND patient_user_id = $2 AND is_active = TRUE`,
      [req.params.id, req.user!.id],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Report not found', 'NOT_FOUND');
    // Production: generate Supabase storage signed URL (15 min TTL) and return it.
    res.json({ data: { url: result.rows[0].file_url, expires_in: 900 } });
  } catch (err) {
    next(err);
  }
});

// ─── Payments (Razorpay stub) ──────────────────────────────────────────────

router.post('/payments/create-order', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const { booking_id } = z
      .object({ booking_id: z.coerce.number().int().positive() })
      .parse(req.body);
    const bookingRes = await query(
      `SELECT id, advance_amount FROM bookings WHERE id = $1 AND patient_user_id = $2`,
      [booking_id, req.user!.id],
    );
    if (bookingRes.rows.length === 0) throw new HttpError(404, 'Booking not found', 'NOT_FOUND');

    // Production: call razorpay.orders.create({ amount: advance*100, currency: 'INR', receipt: code })
    // Stub: insert a payments row with razorpay_order_id = `order_mock_xxx`
    const orderId = `order_mock_${Date.now()}`;
    await query(
      `INSERT INTO payments (booking_id, payment_source, razorpay_order_id, amount, payment_status, payment_type)
       VALUES ($1, 'razorpay', $2, $3, 'created', 'advance')`,
      [booking_id, orderId, Number(bookingRes.rows[0].advance_amount)],
    );
    res.json({
      data: {
        order_id: orderId,
        amount: Number(bookingRes.rows[0].advance_amount),
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID ?? 'rzp_test_dummy',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/webhooks/razorpay', async (req, res, next) => {
  try {
    const eventId = String(req.headers['x-razorpay-event-id'] ?? `evt_${Date.now()}`);
    const eventType = String(req.body?.event ?? 'unknown');
    // Production: verify HMAC-SHA256 signature with RAZORPAY_WEBHOOK_SECRET, then process event.
    await query(
      `INSERT INTO webhook_events (event_id, event_type, payload, signature_valid, processed, received_at)
       VALUES ($1, $2, $3, TRUE, FALSE, NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, JSON.stringify(req.body)],
    );
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: service_categories (Pathology / Radiology / Health Packages …) ─

const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(150).regex(/^[a-z0-9-]+$/).optional(),
  icon_url: z.string().max(500).nullable().optional(),
  banner_url: z.string().max(500).nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});
const categoryUpdateSchema = categoryCreateSchema.partial();

router.get('/admin/service-categories', requireAuth, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.slug, c.icon_url, c.banner_url,
              c.display_order, c.is_active, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM services WHERE category_id = c.id AND is_active = TRUE)::int AS services_count
       FROM service_categories c
       ORDER BY c.display_order, c.name`,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/service-categories', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = categoryCreateSchema.parse(req.body);
    const slug = data.slug ?? slugify(data.name);
    if (!slug) {
      throw new HttpError(400, 'Could not derive a slug from the name', 'BAD_REQUEST');
    }
    const dup = await query<{ name: string; slug: string }>(
      `SELECT name, slug FROM service_categories WHERE name = $1 OR slug = $2`,
      [data.name, slug],
    );
    if (dup.rows.length > 0) {
      const row = dup.rows[0];
      throw new HttpError(
        409,
        row.name === data.name
          ? `A category named "${data.name}" already exists.`
          : `A category with slug "${slug}" already exists.`,
        'DUPLICATE',
      );
    }
    const result = await query<{ id: number }>(
      `INSERT INTO service_categories (name, slug, icon_url, banner_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, TRUE))
       RETURNING id`,
      [
        data.name,
        slug,
        data.icon_url ?? null,
        data.banner_url ?? null,
        data.display_order ?? null,
        data.is_active ?? null,
      ],
    );
    res.status(201).json({ data: { id: result.rows[0].id, slug } });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/service-categories/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = categoryUpdateSchema.parse(req.body);
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      res.json({ data: { updated: false } });
      return;
    }
    const set = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = entries.map(([, v]) => v);
    const result = await query<{ id: number }>(
      `UPDATE service_categories SET ${set}, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id, ...values],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Category not found', 'NOT_FOUND');
    }
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/service-categories/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    // Soft delete: services.category_id FK is ON DELETE RESTRICT, so hard-delete
    // fails the moment any service points at this category. is_active=false is
    // safe — services keep their category label but the category is hidden.
    const result = await query<{ id: number }>(
      `UPDATE service_categories SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Category not found', 'NOT_FOUND');
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: services (tests + packages catalog) ───────────────────────────

const serviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().min(2).max(255).regex(/^[a-z0-9-]+$/).optional(),
  test_key: z.string().trim().max(255).nullable().optional(),
  category_id: z.number().int().positive(),
  price: z.number().nonnegative(),
  short_description: z.string().max(500).nullable().optional(),
  full_details: z.string().max(10000).nullable().optional(),
  prep_instructions: z.string().max(5000).nullable().optional(),
  sample_type: z.string().max(100).nullable().optional(),
  report_turnaround_hours: z.number().int().nonnegative().nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  is_package: z.boolean().optional(),
  package_service_ids: z.array(z.number().int().positive()).nullable().optional(),
  package_discount_percent: z.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

const serviceUpdateSchema = serviceCreateSchema.partial();

router.get('/admin/services', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const filters = z
      .object({
        q: z.string().optional(),
        category_id: z.coerce.number().int().positive().optional(),
        is_active: z.enum(['true', 'false']).optional(),
        is_package: z.enum(['true', 'false']).optional(),
      })
      .parse(req.query);

    const wheres: string[] = [];
    const params: unknown[] = [];
    if (filters.category_id) {
      params.push(filters.category_id);
      wheres.push(`s.category_id = $${params.length}`);
    }
    if (filters.is_active) {
      params.push(filters.is_active === 'true');
      wheres.push(`s.is_active = $${params.length}`);
    }
    if (filters.is_package) {
      params.push(filters.is_package === 'true');
      wheres.push(`s.is_package = $${params.length}`);
    }
    if (filters.q) {
      params.push(`%${filters.q}%`);
      wheres.push(`s.name ILIKE $${params.length}`);
    }
    const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const result = await query(
      `SELECT s.id, s.name, s.slug, s.test_key, s.category_id, s.price,
              s.short_description, s.sample_type, s.report_turnaround_hours,
              s.image_url, s.is_package, s.package_discount_percent, s.is_active,
              c.name AS category_name, c.slug AS category_slug
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       ${whereSql}
       ORDER BY c.display_order, s.name
       LIMIT 1000`,
      params,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/services/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, c.name AS category_name, c.slug AS category_slug
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       WHERE s.id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Service not found', 'NOT_FOUND');
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/services', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = serviceCreateSchema.parse(req.body);
    const slug = data.slug ?? slugify(data.name);
    if (!slug) {
      throw new HttpError(400, 'Could not derive a slug from the name', 'BAD_REQUEST');
    }

    // Confirm the category exists (FK is ON DELETE RESTRICT — better message here).
    const cat = await query<{ id: number }>(
      `SELECT id FROM service_categories WHERE id = $1 AND is_active = TRUE`,
      [data.category_id],
    );
    if (cat.rows.length === 0) {
      throw new HttpError(400, 'Selected category does not exist or is inactive', 'BAD_REQUEST');
    }

    // Friendly duplicate check on slug + test_key (both UNIQUE).
    const dup = await query<{ slug: string; test_key: string | null }>(
      `SELECT slug, test_key FROM services
       WHERE slug = $1 OR (test_key IS NOT NULL AND $2 IS NOT NULL AND test_key = $2)`,
      [slug, data.test_key ?? null],
    );
    if (dup.rows.length > 0) {
      const row = dup.rows[0];
      throw new HttpError(
        409,
        row.slug === slug
          ? `A service with slug "${slug}" already exists.`
          : `A service with test key "${data.test_key}" already exists.`,
        'DUPLICATE',
      );
    }

    // Package consistency: services_package_consistency_chk requires
    // package_service_ids to be a JSON array whenever is_package = TRUE.
    const isPackage = data.is_package ?? false;
    const packageIds = isPackage ? (data.package_service_ids ?? []) : null;

    const result = await query<{ id: number }>(
      `INSERT INTO services
         (category_id, name, slug, test_key, price, short_description, full_details,
          prep_instructions, sample_type, report_turnaround_hours, image_url,
          is_package, package_service_ids, package_discount_percent, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, TRUE))
       RETURNING id`,
      [
        data.category_id,
        data.name,
        slug,
        data.test_key ?? null,
        data.price,
        data.short_description ?? null,
        data.full_details ?? null,
        data.prep_instructions ?? null,
        data.sample_type ?? null,
        data.report_turnaround_hours ?? null,
        data.image_url ?? null,
        isPackage,
        packageIds ? JSON.stringify(packageIds) : null,
        data.package_discount_percent ?? null,
        data.is_active ?? null,
      ],
    );
    res.status(201).json({ data: { id: result.rows[0].id, slug } });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/services/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = serviceUpdateSchema.parse(req.body);
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      res.json({ data: { updated: false } });
      return;
    }
    const set = entries
      .map(([k], i) => `${k} = $${i + 2}`)
      .join(', ');
    const values = entries.map(([k, v]) =>
      k === 'package_service_ids' && v !== null ? JSON.stringify(v) : v,
    );
    const result = await query<{ id: number }>(
      `UPDATE services SET ${set}, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id, ...values],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Service not found', 'NOT_FOUND');
    }
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/services/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    // Soft delete: FK from booking_items.service_id is ON DELETE RESTRICT, so
    // hard-delete would fail once the service has been used. is_active=false
    // hides it from the public catalog and the booking flow.
    const result = await query<{ id: number }>(
      `UPDATE services SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Service not found', 'NOT_FOUND');
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: departments (clinical departments catalog) ────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

const departmentCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(150).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon_url: z.string().max(500).nullable().optional(),
  banner_url: z.string().max(500).nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const departmentUpdateSchema = departmentCreateSchema.partial();

router.get('/admin/departments', requireAuth, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT d.id, d.name, d.slug, d.description, d.icon_url, d.banner_url,
              d.display_order, d.is_active, d.created_at, d.updated_at,
              (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'doctor' AND is_active = TRUE)::int AS doctors_count
       FROM departments d
       ORDER BY d.display_order, d.name`,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/departments', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = departmentCreateSchema.parse(req.body);
    const slug = data.slug ?? slugify(data.name);
    if (!slug) {
      throw new HttpError(400, 'Could not derive a slug from the name', 'BAD_REQUEST');
    }

    // Friendly pre-check — slug + name are both UNIQUE.
    const dup = await query<{ name: string; slug: string }>(
      `SELECT name, slug FROM departments WHERE name = $1 OR slug = $2`,
      [data.name, slug],
    );
    if (dup.rows.length > 0) {
      const row = dup.rows[0];
      throw new HttpError(
        409,
        row.name === data.name
          ? `A department named "${data.name}" already exists.`
          : `A department with slug "${slug}" already exists.`,
        'DUPLICATE',
      );
    }

    const result = await query<{ id: number }>(
      `INSERT INTO departments (name, slug, description, icon_url, banner_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0), COALESCE($7, TRUE))
       RETURNING id`,
      [
        data.name,
        slug,
        data.description ?? null,
        data.icon_url ?? null,
        data.banner_url ?? null,
        data.display_order ?? null,
        data.is_active ?? null,
      ],
    );
    res.status(201).json({ data: { id: result.rows[0].id, slug } });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/departments/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = departmentUpdateSchema.parse(req.body);
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      res.json({ data: { updated: false } });
      return;
    }
    const set = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = entries.map(([, v]) => v);
    const result = await query<{ id: number }>(
      `UPDATE departments SET ${set}, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id, ...values],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Department not found', 'NOT_FOUND');
    }
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/departments/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    // Soft delete — the FK from users.department_id is ON DELETE SET NULL,
    // but is_active = FALSE keeps the row available for historical lookups
    // and matches how every other admin "delete" works in this app.
    const result = await query<{ id: number }>(
      `UPDATE departments SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Department not found', 'NOT_FOUND');
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: doctors (catalog CRUD) ─────────────────────────────────────────

// Shape of a single day in WeeklySchedule. NULL = day off.
const dailyScheduleSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    slot_minutes: z.number().int().min(5).max(240),
    buffer_minutes: z.number().int().min(0).max(120).optional(),
    lunch_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
    lunch_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
    max_bookings: z.number().int().positive().optional(),
  })
  .nullable();

const weeklyScheduleSchema = z
  .object({
    sun: dailyScheduleSchema.optional(),
    mon: dailyScheduleSchema.optional(),
    tue: dailyScheduleSchema.optional(),
    wed: dailyScheduleSchema.optional(),
    thu: dailyScheduleSchema.optional(),
    fri: dailyScheduleSchema.optional(),
    sat: dailyScheduleSchema.optional(),
  })
  .nullable()
  .optional();

const centerInputSchema = z.object({
  center_name: z.string().trim().min(1).max(150),
  address: z.string().trim().min(1).max(500),
  phone: z.string().trim().max(15).nullable().optional(),
  map_link: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  pincode: z.string().trim().max(10).nullable().optional(),
  consultation_fee_override: z.number().nonnegative().nullable().optional(),
  schedule: weeklyScheduleSchema,
  home_visit_schedule: weeklyScheduleSchema,
  is_active: z.boolean().optional(),
});

const doctorCreateSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().email().nullable().optional(),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/)
    .nullable()
    .optional(),
  speciality: z.string().trim().min(1).max(200),
  department_id: z.number().int().positive().nullable().optional(),
  qualifications: z.array(z.string().trim().min(1)).default([]),
  consultation_fee: z.number().nonnegative(),
  about: z.string().max(5000).nullable().optional(),
  education_training: z.string().max(5000).nullable().optional(),
  is_verified: z.boolean().default(false),
  offers_home_visit: z.boolean().default(false),
  is_active: z.boolean().default(true),
  centers: z.array(centerInputSchema).default([]),
});

const doctorUpdateSchema = doctorCreateSchema.partial().omit({ centers: true });

router.get('/admin/doctors', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const filters = z
      .object({
        q: z.string().optional(),
        department_id: z.coerce.number().int().positive().optional(),
        is_active: z.enum(['true', 'false']).optional(),
      })
      .parse(req.query);

    const wheres: string[] = [`u.role = 'doctor'`];
    const params: unknown[] = [];
    if (filters.department_id) {
      params.push(filters.department_id);
      wheres.push(`u.department_id = $${params.length}`);
    }
    if (filters.is_active) {
      params.push(filters.is_active === 'true');
      wheres.push(`u.is_active = $${params.length}`);
    }
    if (filters.q) {
      params.push(`%${filters.q}%`);
      wheres.push(
        `(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.speciality ILIKE $${params.length})`,
      );
    }

    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.mobile,
              u.speciality, u.qualifications, u.consultation_fee,
              u.profile_photo_url, u.is_verified, u.is_active, u.offers_home_visit,
              u.rating_avg, u.rating_count, u.updated_at,
              u.department_id, d.name AS department_name, d.slug AS department_slug,
              (SELECT COUNT(*) FROM doctor_centers WHERE doctor_user_id = u.id AND is_active = TRUE)::int AS centers_count
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE ${wheres.join(' AND ')}
       ORDER BY u.first_name, u.last_name
       LIMIT 500`,
      params,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/doctors/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const docRes = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.mobile,
              u.speciality, u.qualifications, u.consultation_fee,
              u.about, u.education_training,
              u.profile_photo_url, u.is_verified, u.is_active, u.offers_home_visit,
              u.rating_avg, u.rating_count, u.updated_at,
              u.department_id, d.name AS department_name, d.slug AS department_slug
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1 AND u.role = 'doctor'`,
      [req.params.id],
    );
    if (docRes.rows.length === 0) {
      throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
    }
    const centersRes = await query(
      `SELECT id, doctor_user_id, center_name, address, phone, map_link,
              city, pincode, consultation_fee_override, schedule, home_visit_schedule, is_active
       FROM doctor_centers WHERE doctor_user_id = $1 ORDER BY id`,
      [req.params.id],
    );
    res.json({ data: { ...docRes.rows[0], centers: centersRes.rows } });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/doctors', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = doctorCreateSchema.parse(req.body);

    // Pre-check duplicates so the admin sees which field collides instead of
    // a raw DB error. Matches the partial unique indexes on users.mobile
    // (active rows only) and users.email.
    if (data.mobile || data.email) {
      const dupRes = await query<{ mobile: string | null; email: string | null }>(
        `SELECT mobile, email FROM users
         WHERE (mobile IS NOT NULL AND mobile = $1 AND is_active = TRUE)
            OR (email IS NOT NULL AND email = $2)`,
        [data.mobile ?? null, data.email ?? null],
      );
      if (dupRes.rows.length > 0) {
        const row = dupRes.rows[0];
        if (data.mobile && row.mobile === data.mobile) {
          throw new HttpError(
            409,
            `Mobile ${data.mobile} is already in use by another user. Use a different number or leave it blank.`,
            'DUPLICATE_MOBILE',
          );
        }
        if (data.email && row.email?.toLowerCase() === data.email.toLowerCase()) {
          throw new HttpError(
            409,
            `Email ${data.email} is already in use by another user. Use a different email or leave it blank.`,
            'DUPLICATE_EMAIL',
          );
        }
      }
    }

    const created = await transaction(async (client) => {
      // Doctor users don't need to log in by default — is_login_enabled=FALSE
      // satisfies the users_login_capability_chk constraint without a password.
      const userRes = await client.query<{ id: string }>(
        `INSERT INTO users (
            role, first_name, last_name, email, mobile,
            speciality, department_id, qualifications, consultation_fee,
            about, education_training,
            is_verified, offers_home_visit, is_active, is_login_enabled
         ) VALUES (
            'doctor', $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10,
            $11, $12, $13, FALSE
         ) RETURNING id`,
        [
          data.first_name,
          data.last_name,
          data.email ?? null,
          data.mobile ?? null,
          data.speciality,
          data.department_id ?? null,
          data.qualifications,
          data.consultation_fee,
          data.about ?? null,
          data.education_training ?? null,
          data.is_verified,
          data.offers_home_visit,
          data.is_active,
        ],
      );
      const newId = userRes.rows[0].id;

      for (const center of data.centers) {
        await client.query(
          `INSERT INTO doctor_centers
             (doctor_user_id, center_name, address, phone, map_link, city, pincode,
              consultation_fee_override, schedule, home_visit_schedule, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, TRUE))`,
          [
            newId,
            center.center_name,
            center.address,
            center.phone ?? null,
            center.map_link ?? null,
            center.city ?? null,
            center.pincode ?? null,
            center.consultation_fee_override ?? null,
            center.schedule ? JSON.stringify(center.schedule) : null,
            center.home_visit_schedule ? JSON.stringify(center.home_visit_schedule) : null,
            center.is_active ?? null,
          ],
        );
      }
      return { id: newId };
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/doctors/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = doctorUpdateSchema.parse(req.body);
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      res.json({ data: { updated: false } });
      return;
    }
    // Quick existence check to return a clean 404
    const exists = await query(`SELECT id FROM users WHERE id = $1 AND role = 'doctor'`, [
      req.params.id,
    ]);
    if (exists.rows.length === 0) {
      throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
    }
    const set = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = entries.map(([, v]) => v);
    await query(
      `UPDATE users SET ${set}, updated_at = NOW() WHERE id = $1`,
      [req.params.id, ...values],
    );
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/doctors/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    // Soft delete: keep the row for historical bookings (FK is ON DELETE RESTRICT),
    // just flip is_active so the public site and admin list hide them by default.
    const result = await query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND role = 'doctor' RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/doctors/:id/centers', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = centerInputSchema.parse(req.body);
    const exists = await query(`SELECT id FROM users WHERE id = $1 AND role = 'doctor'`, [
      req.params.id,
    ]);
    if (exists.rows.length === 0) {
      throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
    }
    const result = await query<{ id: number }>(
      `INSERT INTO doctor_centers
         (doctor_user_id, center_name, address, phone, map_link, city, pincode,
          consultation_fee_override, schedule, home_visit_schedule, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, TRUE))
       RETURNING id`,
      [
        req.params.id,
        data.center_name,
        data.address,
        data.phone ?? null,
        data.map_link ?? null,
        data.city ?? null,
        data.pincode ?? null,
        data.consultation_fee_override ?? null,
        data.schedule ? JSON.stringify(data.schedule) : null,
        data.home_visit_schedule ? JSON.stringify(data.home_visit_schedule) : null,
        data.is_active ?? null,
      ],
    );
    res.status(201).json({ data: { id: result.rows[0].id } });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/centers/:centerId', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const data = centerInputSchema.partial().parse(req.body);
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      res.json({ data: { updated: false } });
      return;
    }
    // JSON columns need to be stringified before sending to pg
    const set = entries
      .map(([k], i) => `${k} = $${i + 2}`)
      .join(', ');
    const values = entries.map(([k, v]) =>
      k === 'schedule' || k === 'home_visit_schedule'
        ? v === null
          ? null
          : JSON.stringify(v)
        : v,
    );
    const result = await query(
      `UPDATE doctor_centers SET ${set}, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.centerId, ...values],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Center not found', 'NOT_FOUND');
    }
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/centers/:centerId', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE doctor_centers SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.centerId],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Center not found', 'NOT_FOUND');
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: bookings list + detail + status changes ────────────────────────

router.get('/admin/bookings', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const filters = z
      .object({
        type: z.enum(['doctor_appointment', 'test_booking']).optional(),
        origin: z.enum(['online', 'walk_in']).optional(),
        visit_type: z.enum(['in_clinic', 'home_visit']).optional(),
        status: z.string().optional(),
        q: z.string().optional(),
      })
      .parse(req.query);

    const wheres: string[] = [];
    const params: unknown[] = [];
    if (filters.type) {
      params.push(filters.type);
      wheres.push(`booking_type = $${params.length}`);
    }
    if (filters.origin) {
      params.push(filters.origin);
      wheres.push(`booking_origin = $${params.length}`);
    }
    if (filters.visit_type) {
      params.push(filters.visit_type);
      wheres.push(`visit_type = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      wheres.push(`booking_status = $${params.length}`);
    }
    if (filters.q) {
      params.push(`%${filters.q}%`);
      wheres.push(
        `(booking_code ILIKE $${params.length} OR patient_snapshot->>'first_name' ILIKE $${params.length} OR patient_snapshot->>'last_name' ILIKE $${params.length} OR patient_snapshot->>'mobile' ILIKE $${params.length})`,
      );
    }
    const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const result = await query(
      `SELECT b.id, b.booking_code, b.booking_type, b.booking_origin, b.visit_type,
              b.scheduled_date, b.scheduled_start_time, b.total_amount, b.advance_amount,
              b.balance_amount, b.booking_status, b.payment_status, b.collection_status,
              b.patient_snapshot, b.doctor_user_id,
              -- Pull the doctor's display name when present
              (SELECT first_name || ' ' || COALESCE(last_name,'') FROM users WHERE id = b.doctor_user_id) AS doctor_name,
              -- Compact list of item names for the table
              (SELECT string_agg(item_name, ', ' ORDER BY id) FROM booking_items WHERE booking_id = b.id) AS items_summary
       FROM bookings b
       ${whereSql}
       ORDER BY b.created_at DESC
       LIMIT 200`,
      params,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/bookings/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const bookingRes = await query(
      `SELECT b.*,
              (SELECT first_name || ' ' || COALESCE(last_name,'') FROM users WHERE id = b.doctor_user_id) AS doctor_name,
              (SELECT speciality FROM users WHERE id = b.doctor_user_id) AS doctor_speciality,
              (SELECT center_name FROM doctor_centers WHERE id = b.doctor_center_id) AS doctor_center
       FROM bookings b WHERE b.id = $1`,
      [req.params.id],
    );
    if (bookingRes.rows.length === 0) {
      throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
    }
    const items = await query(
      `SELECT id, item_type, service_id, doctor_user_id, item_name, item_description,
              quantity, unit_price, total_price
       FROM booking_items WHERE booking_id = $1 ORDER BY id`,
      [req.params.id],
    );
    const payments = await query(
      `SELECT p.id, p.payment_source, p.razorpay_order_id, p.razorpay_payment_id, p.amount, p.currency,
              p.payment_method, p.payment_status, p.payment_type, p.captured_at, p.refunded_amount,
              p.refund_reason, p.refunded_at, p.notes, p.created_at,
              p.upi_reference, p.verified_at, p.verified_by_user_id, p.verification_notes,
              p.payment_proof_mime,
              CASE WHEN p.payment_proof_bytes IS NOT NULL
                   THEN '/api/v1/admin/payments/' || p.id || '/proof'
                   ELSE NULL END AS proof_url,
              (SELECT first_name || ' ' || COALESCE(last_name,'') FROM users WHERE id = p.verified_by_user_id) AS verified_by_name
         FROM payments p
        WHERE p.booking_id = $1
        ORDER BY p.created_at`,
      [req.params.id],
    );
    const reports = await query(
      `SELECT id, file_name, file_url, file_size_bytes, file_mime, report_type,
              version, is_active, uploaded_at
       FROM reports WHERE booking_id = $1 AND is_active = TRUE ORDER BY version DESC`,
      [req.params.id],
    );
    res.json({
      data: { ...bookingRes.rows[0], items: items.rows, payments: payments.rows, reports: reports.rows },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: dashboard + analytics aggregations ────────────────────────────

router.get('/admin/dashboard', requireAuth, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    // Today and yesterday in Asia/Kolkata so the "today" boundary matches what
    // the receptionist actually sees on the wall clock. We compute dates in JS
    // to avoid timezone gymnastics in SQL.
    const tz = 'Asia/Kolkata';
    const fmtDate = (d: Date) =>
      d.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
    const now = new Date();
    const today = fmtDate(now);
    const yesterday = fmtDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const weekAgo = fmtDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

    // KPI counts + revenue. Revenue is summed from captured/authorized payments
    // (source of truth) — booking.advance_amount can be stale before the
    // recompute trigger fires on offline payments, so payments table wins.
    const kpiRes = await query<{
      today_bookings: number;
      today_revenue: string;
      yesterday_bookings: number;
      yesterday_revenue: string;
      pending_reports: number;
      new_patients_week: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM bookings WHERE scheduled_date = $1) AS today_bookings,
         (SELECT COALESCE(SUM(p.amount - p.refunded_amount), 0)::numeric FROM payments p
            JOIN bookings b ON b.id = p.booking_id
            WHERE b.scheduled_date = $1
              AND p.payment_status IN ('captured', 'authorized')) AS today_revenue,
         (SELECT COUNT(*)::int FROM bookings WHERE scheduled_date = $2) AS yesterday_bookings,
         (SELECT COALESCE(SUM(p.amount - p.refunded_amount), 0)::numeric FROM payments p
            JOIN bookings b ON b.id = p.booking_id
            WHERE b.scheduled_date = $2
              AND p.payment_status IN ('captured', 'authorized')) AS yesterday_revenue,
         (SELECT COUNT(*)::int FROM bookings b
            WHERE b.booking_type = 'test_booking'
              AND b.booking_status IN ('in_progress', 'completed')
              AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.booking_id = b.id AND r.is_active = TRUE)) AS pending_reports,
         (SELECT COUNT(*)::int FROM users
            WHERE role = 'patient' AND created_at >= $3::date) AS new_patients_week`,
      [today, yesterday, weekAgo],
    );
    const kpi = kpiRes.rows[0];

    // Today's schedule (first 10 rows) — includes both online + walk-in.
    const scheduleRes = await query(
      `SELECT b.id, b.booking_code, b.booking_type, b.booking_origin, b.visit_type,
              b.scheduled_start_time, b.booking_status, b.payment_status,
              b.patient_snapshot,
              (SELECT first_name || ' ' || COALESCE(last_name,'') FROM users WHERE id = b.doctor_user_id) AS doctor_name,
              (SELECT string_agg(item_name, ', ' ORDER BY id) FROM booking_items WHERE booking_id = b.id) AS items_summary
       FROM bookings b
       WHERE b.scheduled_date = $1
       ORDER BY b.scheduled_start_time NULLS LAST, b.created_at
       LIMIT 10`,
      [today],
    );

    res.json({
      data: {
        today,
        kpis: {
          today_bookings: kpi.today_bookings,
          today_revenue: Number(kpi.today_revenue),
          yesterday_bookings: kpi.yesterday_bookings,
          yesterday_revenue: Number(kpi.yesterday_revenue),
          pending_reports: kpi.pending_reports,
          new_patients_week: kpi.new_patients_week,
        },
        schedule: scheduleRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/analytics', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { days } = z
      .object({ days: z.coerce.number().int().min(1).max(365).default(30) })
      .parse(req.query);

    const tz = 'Asia/Kolkata';
    const fmtDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
    const now = new Date();
    const to = fmtDate(now);
    const from = fmtDate(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

    // Single round-trip: parallelize all aggregations.
    const [kpiRes, trendRes, topRes, byTypeRes, byOriginRes, byStatusRes, byMethodRes] =
      await Promise.all([
        query<{
          bookings_count: number;
          revenue: string;
          online_count: number;
          walk_in_count: number;
          home_visits_count: number;
          in_clinic_count: number;
          new_patients_count: number;
        }>(
          `SELECT
             (SELECT COUNT(*)::int FROM bookings WHERE created_at::date BETWEEN $1 AND $2) AS bookings_count,
             (SELECT COALESCE(SUM(p.amount - p.refunded_amount), 0)::numeric FROM payments p
                JOIN bookings b ON b.id = p.booking_id
                WHERE b.created_at::date BETWEEN $1 AND $2
                  AND p.payment_status IN ('captured', 'authorized')) AS revenue,
             (SELECT COUNT(*)::int FROM bookings WHERE created_at::date BETWEEN $1 AND $2 AND booking_origin = 'online') AS online_count,
             (SELECT COUNT(*)::int FROM bookings WHERE created_at::date BETWEEN $1 AND $2 AND booking_origin = 'walk_in') AS walk_in_count,
             (SELECT COUNT(*)::int FROM bookings WHERE created_at::date BETWEEN $1 AND $2 AND visit_type = 'home_visit') AS home_visits_count,
             (SELECT COUNT(*)::int FROM bookings WHERE created_at::date BETWEEN $1 AND $2 AND visit_type = 'in_clinic') AS in_clinic_count,
             (SELECT COUNT(*)::int FROM users WHERE role = 'patient' AND created_at::date BETWEEN $1 AND $2) AS new_patients_count`,
          [from, to],
        ),
        // Daily revenue + booking count for the trend line/bar chart.
        // generate_series gives us a row per day even when there are no bookings,
        // so the chart has no gaps.
        query<{ d: string; revenue: string; bookings: number }>(
          `SELECT g.d::text AS d,
                  COALESCE(SUM(CASE WHEN p.payment_status IN ('captured','authorized')
                                    THEN p.amount - p.refunded_amount ELSE 0 END), 0)::numeric AS revenue,
                  COUNT(DISTINCT b.id)::int AS bookings
           FROM generate_series($1::date, $2::date, '1 day'::interval) AS g(d)
           LEFT JOIN bookings b ON b.created_at::date = g.d
           LEFT JOIN payments p ON p.booking_id = b.id
           GROUP BY g.d
           ORDER BY g.d`,
          [from, to],
        ),
        // Top services by booking volume (with revenue).
        query<{ item_name: string; count: number; revenue: string }>(
          `SELECT bi.item_name,
                  COUNT(*)::int AS count,
                  COALESCE(SUM(bi.total_price), 0)::numeric AS revenue
           FROM booking_items bi
           JOIN bookings b ON b.id = bi.booking_id
           WHERE b.created_at::date BETWEEN $1 AND $2
           GROUP BY bi.item_name
           ORDER BY count DESC, revenue DESC
           LIMIT 10`,
          [from, to],
        ),
        query<{ booking_type: string; count: number; revenue: string }>(
          `SELECT b.booking_type,
                  COUNT(*)::int AS count,
                  COALESCE(SUM(b.total_amount), 0)::numeric AS revenue
           FROM bookings b
           WHERE b.created_at::date BETWEEN $1 AND $2
           GROUP BY b.booking_type`,
          [from, to],
        ),
        query<{ booking_origin: string; count: number; revenue: string }>(
          `SELECT b.booking_origin,
                  COUNT(*)::int AS count,
                  COALESCE(SUM(b.total_amount), 0)::numeric AS revenue
           FROM bookings b
           WHERE b.created_at::date BETWEEN $1 AND $2
           GROUP BY b.booking_origin`,
          [from, to],
        ),
        query<{ booking_status: string; count: number }>(
          `SELECT booking_status, COUNT(*)::int AS count
           FROM bookings
           WHERE created_at::date BETWEEN $1 AND $2
           GROUP BY booking_status
           ORDER BY count DESC`,
          [from, to],
        ),
        query<{ payment_method: string | null; count: number; amount: string }>(
          `SELECT p.payment_method,
                  COUNT(*)::int AS count,
                  COALESCE(SUM(p.amount - p.refunded_amount), 0)::numeric AS amount
           FROM payments p
           JOIN bookings b ON b.id = p.booking_id
           WHERE b.created_at::date BETWEEN $1 AND $2
             AND p.payment_status IN ('captured', 'authorized')
           GROUP BY p.payment_method
           ORDER BY amount DESC`,
          [from, to],
        ),
      ]);

    const kpi = kpiRes.rows[0];
    res.json({
      data: {
        range: { from, to, days },
        kpis: {
          bookings_count: kpi.bookings_count,
          revenue: Number(kpi.revenue),
          online_count: kpi.online_count,
          walk_in_count: kpi.walk_in_count,
          home_visits_count: kpi.home_visits_count,
          in_clinic_count: kpi.in_clinic_count,
          new_patients_count: kpi.new_patients_count,
        },
        revenue_trend: trendRes.rows.map((r) => ({
          date: r.d,
          revenue: Number(r.revenue),
          bookings: r.bookings,
        })),
        top_services: topRes.rows.map((r) => ({
          item_name: r.item_name,
          count: r.count,
          revenue: Number(r.revenue),
        })),
        by_type: byTypeRes.rows.map((r) => ({
          key: r.booking_type,
          count: r.count,
          revenue: Number(r.revenue),
        })),
        by_origin: byOriginRes.rows.map((r) => ({
          key: r.booking_origin,
          count: r.count,
          revenue: Number(r.revenue),
        })),
        by_status: byStatusRes.rows.map((r) => ({ key: r.booking_status, count: r.count })),
        by_payment_method: byMethodRes.rows.map((r) => ({
          key: r.payment_method ?? 'unknown',
          count: r.count,
          amount: Number(r.amount),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/bookings/:id/status', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { status } = z
      .object({
        status: z.enum([
          'pending_payment',
          'confirmed',
          'in_progress',
          'completed',
          'cancelled',
          'no_show',
        ]),
      })
      .parse(req.body);
    const result = await query(
      `UPDATE bookings SET booking_status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [status, req.params.id],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: manual-UPI payment re-verify queue + action ───────────────────
// Two-stage flow per plan/migration 0024: the patient's proof upload at
// booking time already flipped `payments.payment_status='captured'` and the
// booking to `confirmed`. This is the IN-PERSON re-verify step admin runs at
// sample-collection / clinic-visit time. We just stamp `verified_at` plus
// who did it; nothing else changes.

router.get(
  '/admin/payments/pending-re-verify',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (_req, res, next) => {
    try {
      const result = await query(
        `SELECT p.id              AS payment_id,
                p.amount,
                p.upi_reference,
                p.payment_proof_mime,
                p.created_at      AS submitted_at,
                b.id              AS booking_id,
                b.booking_code,
                b.booking_type,
                b.booking_origin,
                b.visit_type,
                b.scheduled_date,
                b.scheduled_start_time,
                b.patient_snapshot,
                b.total_amount,
                b.advance_amount,
                b.balance_amount,
                b.booking_status,
                b.payment_status
           FROM payments p
           JOIN bookings b ON b.id = p.booking_id
          WHERE p.payment_source = 'upi_manual'
            AND p.verified_at IS NULL
            AND b.booking_status NOT IN ('cancelled', 'no_show')
          ORDER BY b.scheduled_date NULLS LAST, p.created_at`,
      );
      res.json({ data: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/admin/payments/:paymentId/re-verify',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const paymentId = Number(req.params.paymentId);
      if (!Number.isInteger(paymentId)) {
        throw new HttpError(400, 'Invalid payment id', 'BAD_REQUEST');
      }
      const { notes } = z
        .object({ notes: z.string().max(500).optional() })
        .parse(req.body ?? {});

      // Idempotent: only flip if not already re-verified. Returns the row
      // whether or not the UPDATE matched, so the caller can show "already
      // verified by X on Y" without a second round-trip.
      const result = await query<{
        id: number;
        booking_id: number;
        verified_at: string | null;
        verified_by_user_id: string | null;
      }>(
        `WITH upd AS (
           UPDATE payments
              SET verified_by_user_id = $1,
                  verified_at         = NOW(),
                  verification_notes  = COALESCE($2, verification_notes)
            WHERE id = $3
              AND payment_source = 'upi_manual'
              AND verified_at IS NULL
          RETURNING id, booking_id, verified_at, verified_by_user_id
         )
         SELECT id, booking_id, verified_at, verified_by_user_id FROM upd
         UNION ALL
         SELECT id, booking_id, verified_at, verified_by_user_id
           FROM payments
          WHERE id = $3
            AND NOT EXISTS (SELECT 1 FROM upd)
          LIMIT 1`,
        [req.user!.id, notes ?? null, paymentId],
      );
      if (result.rows.length === 0) {
        throw new HttpError(404, 'Payment not found', 'NOT_FOUND');
      }
      res.json({ data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Admin: booking lookup by code (used by report upload flow) ───────────
// Distinct path (not `/admin/bookings/lookup`) because that would collide
// with `/admin/bookings/:id` and Express would route 'lookup' as an id.

router.get('/admin/booking-lookup', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { code } = z
      .object({ code: z.string().trim().min(3).max(30) })
      .parse(req.query);
    const result = await query(
      `SELECT id, booking_code, booking_type, booking_origin, visit_type,
              scheduled_date, scheduled_start_time, booking_status, payment_status,
              patient_user_id, patient_snapshot,
              (SELECT string_agg(item_name, ', ' ORDER BY id) FROM booking_items WHERE booking_id = bookings.id) AS items_summary,
              (SELECT first_name || ' ' || COALESCE(last_name,'') FROM users WHERE id = bookings.doctor_user_id) AS doctor_name
       FROM bookings WHERE booking_code = $1`,
      [code],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, `No booking found for code ${code}`, 'NOT_FOUND');
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: recently uploaded reports (cross-booking) ─────────────────────

router.get('/admin/reports', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const filters = z
      .object({
        q: z.string().optional(),
        limit: z.coerce.number().int().positive().max(500).optional(),
      })
      .parse(req.query);
    const wheres: string[] = ['r.is_active = TRUE'];
    const params: unknown[] = [];
    if (filters.q) {
      params.push(`%${filters.q}%`);
      wheres.push(
        `(b.booking_code ILIKE $${params.length} OR r.file_name ILIKE $${params.length} OR b.patient_snapshot->>'first_name' ILIKE $${params.length} OR b.patient_snapshot->>'last_name' ILIKE $${params.length} OR b.patient_snapshot->>'mobile' ILIKE $${params.length})`,
      );
    }
    params.push(filters.limit ?? 100);
    const limitParam = params.length;
    const result = await query(
      `SELECT r.id, r.file_name, r.file_url, r.file_mime, r.file_size_bytes,
              r.report_type, r.version, r.uploaded_at,
              b.id AS booking_id, b.booking_code, b.booking_type,
              b.patient_snapshot
       FROM reports r
       JOIN bookings b ON b.id = r.booking_id
       WHERE ${wheres.join(' AND ')}
       ORDER BY r.uploaded_at DESC
       LIMIT $${limitParam}`,
      params,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: walk-in bill creation ───────────────────────────────────────────

const walkInItemSchema = z.union([
  z.object({
    service_id: z.number().int().positive(),
    quantity: z.number().int().positive().default(1),
  }),
  z.object({
    item_name: z.string().min(1).max(255),
    unit_price: z.number().nonnegative(),
    quantity: z.number().int().positive().default(1),
    item_type: z.literal('custom'),
  }),
]);

// Form inputs send '' (empty string) for optional fields that weren't filled.
// Convert those to undefined so zod's .optional() treats them as absent.
const blankToUndef = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;
const optStr = (max: number) =>
  z.preprocess(blankToUndef, z.string().max(max).optional());
const optEmail = z.preprocess(blankToUndef, z.string().email('Invalid email').optional());
const optAge = z.preprocess(
  blankToUndef,
  z.coerce.number().int().positive().max(200).optional(),
);

const walkInBillSchema = z.object({
  patient: z.object({
    first_name: z.string().trim().min(1, 'Patient first name is required').max(100),
    last_name: optStr(100),
    mobile: z
      .string()
      .trim()
      .regex(/^\d{10,15}$/, 'Mobile must be 10–15 digits'),
    age: optAge,
    gender: z.preprocess(blankToUndef, z.enum(['M', 'F', 'O']).optional()),
    email: optEmail,
  }),
  items: z.array(walkInItemSchema).min(1, 'Add at least one item'),
  payment: z
    .object({
      method: z.enum(['cash', 'upi_qr_offline', 'card_swipe', 'cheque']),
      amount: z.number().nonnegative(),
      notes: optStr(500),
    })
    .optional(),
  patient_user_id: z.preprocess(blankToUndef, z.string().uuid().optional()),
});

router.post(
  '/admin/walk-in-bills',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const data = walkInBillSchema.parse(req.body);
      const today = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toTimeString().slice(0, 8);

      const created = await transaction(async (client) => {
        // Resolve catalog items so we always store name + price snapshots
        const catalogIds = data.items
          .map((i) => ('service_id' in i ? i.service_id : null))
          .filter((id): id is number => id !== null);

        // services.id is BIGSERIAL — pg returns it as a string, NOT a number.
        // Typing the row as `string` here makes the `.find()` comparison
        // below honest about what's happening.
        const catalog =
          catalogIds.length > 0
            ? await client.query<{ id: string; name: string; price: string; is_package: boolean }>(
                `SELECT id, name, price, is_package FROM services WHERE id = ANY($1::bigint[])`,
                [catalogIds],
              )
            : { rows: [] as Array<{ id: string; name: string; price: string; is_package: boolean }> };

        const normalised = data.items.map((i) => {
          if ('service_id' in i) {
            // i.service_id is a number; svc.id is a string from pg — coerce.
            const svc = catalog.rows.find((s) => Number(s.id) === i.service_id);
            if (!svc) throw new HttpError(404, `Service ${i.service_id} not found`, 'NOT_FOUND');
            return {
              item_type: svc.is_package ? 'package' : ('test' as const),
              service_id: Number(svc.id),
              item_name: svc.name,
              unit_price: Number(svc.price),
              quantity: i.quantity,
            };
          }
          return {
            item_type: 'custom' as const,
            service_id: null,
            item_name: i.item_name,
            unit_price: i.unit_price,
            quantity: i.quantity,
          };
        });

        const subtotal = normalised.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        const total = subtotal;
        const paid = data.payment?.amount ?? 0;
        const balance = Math.max(0, total - paid);
        const paymentStatus = paid <= 0 ? 'pending' : paid >= total ? 'paid' : 'partial';
        const bookingStatus = paid >= total ? 'completed' : 'in_progress';

        // 1. bookings
        const bookingRes = await client.query<{ id: number; booking_code: string }>(
          `INSERT INTO bookings (
             patient_user_id, booking_type, booking_origin, visit_type,
             scheduled_date, scheduled_start_time,
             patient_snapshot,
             subtotal_amount, total_amount, advance_amount, balance_amount,
             booking_status, payment_status, collection_status,
             created_by_user_id
           ) VALUES (
             $1, 'test_booking', 'walk_in', 'in_clinic',
             $2, $3, $4,
             $5, $5, $6, $7,
             $8, $9, 'not_required',
             $10
           ) RETURNING id, booking_code`,
          [
            data.patient_user_id ?? null,
            today,
            nowTime,
            JSON.stringify(data.patient),
            subtotal,
            paid,
            balance,
            bookingStatus,
            paymentStatus,
            req.user!.id,
          ],
        );
        const booking = bookingRes.rows[0];

        // 2. booking_items
        for (const item of normalised) {
          await client.query(
            `INSERT INTO booking_items
               (booking_id, item_type, service_id, item_name, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              booking.id,
              item.item_type,
              item.service_id,
              item.item_name,
              item.quantity,
              item.unit_price,
              item.unit_price * item.quantity,
            ],
          );
        }

        // 3. payments (only if money changed hands)
        if (data.payment && data.payment.amount > 0) {
          await client.query(
            `INSERT INTO payments
               (booking_id, payment_source, amount, currency, payment_method,
                payment_status, payment_type, collected_by_user_id, captured_at, notes)
             VALUES ($1, 'offline', $2, 'INR', $3, 'captured', $4, $5, NOW(), $6)`,
            [
              booking.id,
              data.payment.amount,
              data.payment.method,
              paid >= total ? 'full' : 'advance',
              req.user!.id,
              data.payment.notes ?? null,
            ],
          );
        }

        // 4. invoices (sequence trigger generates invoice_number)
        await client.query(
          `INSERT INTO invoices (booking_id, subtotal_amount, tax_amount, discount_amount, total_amount, invoice_number)
           VALUES ($1, $2, 0, 0, $2, '')`,
          [booking.id, total],
        );

        return booking;
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Admin: record an offline payment against an existing booking ──────────

const recordPaymentSchema = z.object({
  method: z.enum(['cash', 'upi_qr_offline', 'card_swipe', 'cheque']),
  amount: z.number().positive(),
  notes: z.string().max(500).optional(),
  payment_type: z.enum(['advance', 'balance', 'full']).default('balance'),
});

router.post(
  '/admin/bookings/:id/payments',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const data = recordPaymentSchema.parse(req.body);
      const bookingId = req.params.id;

      const updated = await transaction(async (client) => {
        const bookingRes = await client.query<{ total_amount: number; balance_amount: number }>(
          `SELECT total_amount, balance_amount FROM bookings WHERE id = $1 FOR UPDATE`,
          [bookingId],
        );
        if (bookingRes.rows.length === 0) {
          throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
        }
        await client.query(
          `INSERT INTO payments
             (booking_id, payment_source, amount, currency, payment_method,
              payment_status, payment_type, collected_by_user_id, captured_at, notes)
           VALUES ($1, 'offline', $2, 'INR', $3, 'captured', $4, $5, NOW(), $6)`,
          [bookingId, data.amount, data.method, data.payment_type, req.user!.id, data.notes ?? null],
        );
        // Recompute paid + balance from the payments table (source of truth)
        const summed = await client.query<{ paid: number }>(
          `SELECT COALESCE(SUM(amount - refunded_amount), 0)::numeric AS paid
           FROM payments
           WHERE booking_id = $1 AND payment_status IN ('captured', 'authorized')`,
          [bookingId],
        );
        const paid = Number(summed.rows[0].paid);
        const total = Number(bookingRes.rows[0].total_amount);
        const balance = Math.max(0, total - paid);
        const newStatus = paid <= 0 ? 'pending' : paid >= total ? 'paid' : 'partial';
        await client.query(
          `UPDATE bookings
             SET advance_amount = $1, balance_amount = $2, payment_status = $3, updated_at = NOW()
           WHERE id = $4`,
          [paid, balance, newStatus, bookingId],
        );
        return { paid, balance, payment_status: newStatus };
      });
      res.status(201).json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
