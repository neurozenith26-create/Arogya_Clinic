import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { query, transaction } from '../../db/pool.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router: ExpressRouter = Router();

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

router.get('/doctors/:id/slots', async (req, res, next) => {
  try {
    const date = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, 'date param required as YYYY-MM-DD', 'BAD_REQUEST');
    }
    // Real implementation: read doctor_centers.schedule JSONB for weekday,
    // subtract doctor_unavailability, subtract booked slots, return grid.
    // Stub here returns a fixed range — fill in once Supabase wired.
    res.json({
      data: {
        date,
        slots: Array.from({ length: 16 }, (_, i) => {
          const h = 9 + Math.floor(i / 4);
          const m = (i % 4) * 15;
          return {
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            available: i % 3 !== 0,
          };
        }),
      },
    });
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
  doctor_center_id: z.number().int().positive(),
  visit_type: z.enum(['in_clinic', 'home_visit']),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  patient_snapshot: z.record(z.unknown()),
  reason_for_visit: z.string().optional(),
});

router.post('/bookings/doctor-appointment', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const data = doctorBookingSchema.parse(req.body);
    const booking = await transaction(async (client) => {
      const consultFeeRes = await client.query<{ consultation_fee: number }>(
        'SELECT consultation_fee FROM users WHERE id = $1 AND role = $2',
        [data.doctor_id, 'doctor'],
      );
      if (consultFeeRes.rows.length === 0) throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
      const fee = Number(consultFeeRes.rows[0].consultation_fee);
      const advance = Math.round(fee / 2);

      const bookingRes = await client.query(
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
          'pending_payment', 'pending', $11, $1
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
          fee - advance,
          data.reason_for_visit ?? null,
        ],
      );

      await client.query(
        `INSERT INTO booking_items (booking_id, item_type, doctor_user_id, item_name, quantity, unit_price, total_price)
         VALUES ($1, 'doctor_consultation', $2, $3, 1, $4, $4)`,
        [bookingRes.rows[0].id, data.doctor_id, 'Doctor consultation', fee],
      );

      return bookingRes.rows[0];
    });
    res.status(201).json({ data: booking });
  } catch (err) {
    next(err);
  }
});

const testBookingSchema = z.object({
  items: z
    .array(z.object({ service_id: z.number().int().positive(), quantity: z.number().int().positive() }))
    .min(1),
  visit_type: z.enum(['in_clinic', 'home_visit']),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  patient_snapshot: z.record(z.unknown()),
  delivery_address: z.record(z.unknown()).optional(),
  home_visit_charge: z.number().nonnegative().default(0),
  special_instructions: z.string().optional(),
});

router.post('/bookings/test', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const data = testBookingSchema.parse(req.body);
    const booking = await transaction(async (client) => {
      const ids = data.items.map((i) => i.service_id);
      const svcRes = await client.query<{ id: number; name: string; price: number; is_package: boolean }>(
        `SELECT id, name, price, is_package FROM services WHERE id = ANY($1::bigint[]) AND is_active = TRUE`,
        [ids],
      );

      let subtotal = 0;
      const itemRows = data.items.map((i) => {
        const svc = svcRes.rows.find((s) => s.id === i.service_id);
        if (!svc) throw new HttpError(404, `Service ${i.service_id} not found`, 'NOT_FOUND');
        const price = Number(svc.price);
        subtotal += price * i.quantity;
        return { ...i, name: svc.name, price, is_package: svc.is_package };
      });

      const total = subtotal + data.home_visit_charge;
      const advance = Math.round(total / 2);

      const bookingRes = await client.query(
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
          'pending_payment', 'pending', $12,
          $13, $1
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
          total - advance,
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
      return bookingRes.rows[0];
    });
    res.status(201).json({ data: booking });
  } catch (err) {
    next(err);
  }
});

router.get('/bookings', requireAuth, requireRole('patient'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, booking_code, booking_type, visit_type, scheduled_date, scheduled_start_time,
              total_amount, advance_amount, balance_amount, booking_status, payment_status,
              doctor_user_id, created_at
       FROM bookings
       WHERE patient_user_id = $1
       ORDER BY scheduled_date DESC, scheduled_start_time DESC`,
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
      `SELECT * FROM bookings WHERE id = $1 AND patient_user_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (bookingRes.rows.length === 0) throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
    const items = await query('SELECT * FROM booking_items WHERE booking_id = $1', [req.params.id]);
    const reports = await query(
      'SELECT id, file_name, uploaded_at FROM reports WHERE booking_id = $1 AND is_active = TRUE',
      [req.params.id],
    );
    res.json({ data: { ...bookingRes.rows[0], items: items.rows, reports: reports.rows } });
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

// ─── Admin (minimal stub — full CRUD added in M2/M3) ────────────────────────

router.get('/admin/bookings', requireAuth, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, booking_code, booking_type, booking_origin, visit_type,
              scheduled_date, scheduled_start_time, total_amount, advance_amount,
              booking_status, payment_status, collection_status, patient_snapshot, doctor_user_id
       FROM bookings
       ORDER BY scheduled_date DESC, scheduled_start_time DESC
       LIMIT 200`,
    );
    res.json({ data: result.rows });
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

export default router;
