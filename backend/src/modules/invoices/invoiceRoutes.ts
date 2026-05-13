import { Router, type Router as ExpressRouter } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../../db/pool.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router: ExpressRouter = Router();

interface BookingRow {
  id: number;
  booking_code: string;
  booking_type: string;
  booking_origin: string;
  visit_type: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
    email?: string | null;
    age?: number;
    gender?: string;
  } | null;
  total_amount: string;
  advance_amount: string;
  balance_amount: string;
  payment_status: string;
  created_at: string;
}

interface ItemRow {
  item_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

interface InvoiceRow {
  invoice_number: string;
  generated_at: string;
  gstin: string | null;
}

interface ClinicSettings {
  clinic_name: string;
  clinic_address: string;
  helpline_phone: string;
  support_email: string;
  gstin: string;
}

async function loadClinicSettings(): Promise<ClinicSettings> {
  const result = await query<{ key: string; value: unknown }>(
    `SELECT key, value FROM clinic_settings WHERE key IN
       ('clinic_name','clinic_short_name','clinic_address','helpline_phone','support_email','gstin')`,
  );
  const map = new Map<string, unknown>(result.rows.map((r) => [r.key, r.value]));
  // JSONB values come back already-parsed when pg knows the column type. Fall back to the
  // raw value if it isn't an object.
  const text = (k: string, fallback: string): string => {
    const v = map.get(k);
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      try {
        return JSON.parse(JSON.stringify(v)) as string;
      } catch {
        return fallback;
      }
    }
    return fallback;
  };
  // clinic_address may be a JSONB object — flatten it
  const addrRaw = map.get('clinic_address');
  let address = '';
  if (typeof addrRaw === 'object' && addrRaw !== null) {
    const a = addrRaw as Record<string, string | null>;
    address = [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');
  } else if (typeof addrRaw === 'string') {
    address = addrRaw;
  }
  return {
    clinic_name: text('clinic_name', 'Arogya Diagnostics & Multispeciality Clinic'),
    clinic_address: address || 'Kolkata, West Bengal',
    helpline_phone: text('helpline_phone', '+91 98319 90734'),
    support_email: text('support_email', 'arogyaclinic2025@gmail.com'),
    gstin: text('gstin', ''),
  };
}

function inr(amount: string | number): string {
  const n = Number(amount);
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Admin: list all invoices ─────────────────────────────────────────────

router.get(
  '/admin/invoices',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const filters = req.query as Record<string, string | undefined>;
      const wheres: string[] = [];
      const params: unknown[] = [];
      if (filters.type === 'doctor_appointment' || filters.type === 'test_booking') {
        params.push(filters.type);
        wheres.push(`b.booking_type = $${params.length}`);
      }
      if (filters.origin === 'online' || filters.origin === 'walk_in') {
        params.push(filters.origin);
        wheres.push(`b.booking_origin = $${params.length}`);
      }
      if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
        params.push(filters.from);
        wheres.push(`i.generated_at::date >= $${params.length}`);
      }
      if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
        params.push(filters.to);
        wheres.push(`i.generated_at::date <= $${params.length}`);
      }
      if (filters.q) {
        params.push(`%${filters.q}%`);
        wheres.push(
          `(i.invoice_number ILIKE $${params.length} OR b.booking_code ILIKE $${params.length} OR b.patient_snapshot->>'first_name' ILIKE $${params.length} OR b.patient_snapshot->>'last_name' ILIKE $${params.length} OR b.patient_snapshot->>'mobile' ILIKE $${params.length})`,
        );
      }
      const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
      const result = await query(
        `SELECT i.id, i.invoice_number, i.total_amount, i.generated_at,
                b.id AS booking_id, b.booking_code, b.booking_type, b.booking_origin,
                b.payment_status, b.advance_amount, b.balance_amount,
                b.patient_snapshot
         FROM invoices i
         JOIN bookings b ON b.id = i.booking_id
         ${whereSql}
         ORDER BY i.generated_at DESC
         LIMIT 500`,
        params,
      );
      res.json({ data: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Admin: download a single invoice as a printable PDF ──────────────────

router.get(
  '/admin/bookings/:id/invoice.pdf',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const bookingRes = await query<BookingRow>(
        `SELECT id, booking_code, booking_type, booking_origin, visit_type,
                scheduled_date, scheduled_start_time, patient_snapshot,
                total_amount, advance_amount, balance_amount, payment_status, created_at
         FROM bookings WHERE id = $1`,
        [req.params.id],
      );
      if (bookingRes.rows.length === 0) {
        throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
      }
      const booking = bookingRes.rows[0];

      const itemsRes = await query<ItemRow>(
        `SELECT item_name, quantity, unit_price, total_price
         FROM booking_items WHERE booking_id = $1 ORDER BY id`,
        [req.params.id],
      );

      const invoiceRes = await query<InvoiceRow>(
        `SELECT invoice_number, generated_at, gstin
         FROM invoices WHERE booking_id = $1 ORDER BY id DESC LIMIT 1`,
        [req.params.id],
      );
      const invoice = invoiceRes.rows[0] ?? null;
      const clinic = await loadClinicSettings();

      // ── Stream PDF ────────────────────────────────────────────────────
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="invoice-${booking.booking_code}.pdf"`,
      );
      doc.pipe(res);

      // Header
      doc.fillColor('#0066D9').fontSize(22).font('Helvetica-Bold')
        .text(clinic.clinic_name, { align: 'left' });
      doc.fillColor('#666').fontSize(10).font('Helvetica')
        .text(clinic.clinic_address)
        .text(`Phone: ${clinic.helpline_phone}  |  Email: ${clinic.support_email}`);
      if (clinic.gstin) doc.text(`GSTIN: ${clinic.gstin}`);
      doc.moveDown(0.5);
      doc.strokeColor('#0066D9').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Invoice meta + patient panel (two columns)
      const topY = doc.y;
      doc.fillColor('#000').fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', 50, topY);
      doc.fontSize(10).font('Helvetica').fillColor('#444');
      doc.text(`Invoice #: ${invoice?.invoice_number ?? '—'}`, 50, topY + 25);
      doc.text(`Booking #: ${booking.booking_code}`);
      const invDate = invoice?.generated_at ?? booking.created_at;
      doc.text(`Date: ${new Date(invDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      doc.text(
        `Origin: ${booking.booking_origin === 'walk_in' ? 'Walk-in' : 'Online'}  |  Visit: ${
          booking.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'
        }`,
      );

      // Patient column (right side)
      const patient = booking.patient_snapshot ?? {};
      const patientX = 320;
      doc.font('Helvetica-Bold').fillColor('#000').text('Bill To', patientX, topY);
      doc.font('Helvetica').fillColor('#444').fontSize(10);
      const patientName =
        [patient.first_name, patient.last_name].filter(Boolean).join(' ') || '—';
      doc.text(patientName, patientX, topY + 25);
      if (patient.mobile) doc.text(`Mobile: ${patient.mobile}`, patientX);
      if (patient.email) doc.text(`Email: ${patient.email}`, patientX);
      if (patient.age) doc.text(`Age: ${patient.age}`, patientX);

      doc.moveDown(3);

      // Items table
      const tableTop = doc.y + 10;
      const colX = { item: 50, qty: 360, rate: 410, amount: 480 };
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff');
      doc.rect(50, tableTop, 495, 22).fill('#0066D9');
      doc.fillColor('#fff')
        .text('Item / Service', colX.item + 8, tableTop + 7, { width: 295 })
        .text('Qty', colX.qty, tableTop + 7, { width: 40, align: 'right' })
        .text('Rate', colX.rate, tableTop + 7, { width: 60, align: 'right' })
        .text('Amount', colX.amount, tableTop + 7, { width: 60, align: 'right' });

      let rowY = tableTop + 24;
      doc.font('Helvetica').fillColor('#000').fontSize(10);
      let subtotal = 0;
      for (const item of itemsRes.rows) {
        const lineTotal = Number(item.total_price);
        subtotal += lineTotal;
        doc.fillColor('#000')
          .text(item.item_name, colX.item + 8, rowY + 4, { width: 295 })
          .text(String(item.quantity), colX.qty, rowY + 4, { width: 40, align: 'right' })
          .text(inr(item.unit_price), colX.rate, rowY + 4, { width: 60, align: 'right' })
          .text(inr(item.total_price), colX.amount, rowY + 4, { width: 60, align: 'right' });
        rowY += 20;
        doc.strokeColor('#eee').lineWidth(0.5).moveTo(50, rowY).lineTo(545, rowY).stroke();
      }

      // Totals box (right-aligned)
      rowY += 16;
      const total = Number(booking.total_amount);
      const paid = Number(booking.advance_amount);
      const balance = Number(booking.balance_amount);

      const labelX = 360;
      const valueX = 480;
      const valueWidth = 60;
      doc.font('Helvetica').fontSize(10).fillColor('#444');
      doc.text('Subtotal', labelX, rowY)
        .text(inr(subtotal), valueX, rowY, { width: valueWidth, align: 'right' });
      rowY += 16;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
      doc.text('Total', labelX, rowY)
        .text(inr(total), valueX, rowY, { width: valueWidth, align: 'right' });
      rowY += 20;
      doc.font('Helvetica').fontSize(10).fillColor('#0a8a3a');
      doc.text('Paid', labelX, rowY)
        .text(inr(paid), valueX, rowY, { width: valueWidth, align: 'right' });
      rowY += 16;
      doc.fillColor(balance > 0 ? '#b00020' : '#444');
      doc.text('Balance', labelX, rowY)
        .text(inr(balance), valueX, rowY, { width: valueWidth, align: 'right' });

      // Footer
      doc.font('Helvetica').fillColor('#666').fontSize(8);
      doc.text(
        balance > 0
          ? `Balance of ${inr(balance)} due at time of service.`
          : 'Thank you — payment received in full.',
        50,
        750,
        { align: 'center', width: 495 },
      );
      doc.text(
        `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  Computer-generated invoice; no signature required.`,
        50,
        765,
        { align: 'center', width: 495 },
      );

      doc.end();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
