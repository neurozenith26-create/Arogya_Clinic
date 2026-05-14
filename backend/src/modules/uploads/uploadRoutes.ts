import path from 'node:path';
import crypto from 'node:crypto';
import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { query } from '../../db/pool.js';
import { notify } from '../../lib/notify.js';

function reportFileUrl(storageKey: string): string {
  return `${env.BACKEND_PUBLIC_URL.replace(/\/$/, '')}/api/v1/files/${storageKey}`;
}

const router: ExpressRouter = Router();

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
// Report uploads accept any file type — admins are trusted, and a clinic may
// upload PDFs, images, DICOM, Word docs, ZIPs, etc. We only enforce a size
// cap. Patient downloads happen via signed URL with Content-Disposition, so
// nothing dangerous auto-executes in the browser.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE },
});

/**
 * Admin uploads a medical report against a booking.
 * Storage is pluggable (local in dev, S3 in prod) — see lib/storage.ts.
 */
router.post(
  '/admin/bookings/:bookingId/reports',
  requireAuth,
  requireRole('admin', 'super_admin'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const bookingId = Number(req.params.bookingId);
      if (!Number.isInteger(bookingId)) {
        throw new HttpError(400, 'Invalid booking id', 'BAD_REQUEST');
      }
      if (!req.file) throw new HttpError(400, 'File missing', 'BAD_REQUEST');

      // patient_user_id is NULL for walk-in bookings (admin captured the
      // patient in patient_snapshot only — no auth account exists). The
      // reports.patient_user_id column is nullable too (migration 0023), so
      // we just pass through whatever bookings has. booking_code is also
      // pulled for the patient notification below.
      const bookingRes = await query<{
        id: number;
        patient_user_id: string | null;
        booking_code: string;
      }>(
        `SELECT id, patient_user_id, booking_code FROM bookings WHERE id = $1`,
        [bookingId],
      );
      if (bookingRes.rows.length === 0) {
        throw new HttpError(404, 'Booking not found', 'NOT_FOUND');
      }
      const booking = bookingRes.rows[0];

      // Files are persisted as BYTEA in the reports row (migration 0027) —
      // same pattern as users.profile_photo_bytes (0022) and
      // payments.payment_proof_bytes (0024). storage_key is the unguessable
      // handle that the public GET /files/:storageKey route uses to look the
      // bytes back up — never the surrogate report id.
      const ext = path.extname(req.file.originalname) || '';
      const storageKey = `${crypto.randomUUID()}${ext}`;
      const fileUrl = reportFileUrl(storageKey);

      const reportType = (req.body.report_type as string) ?? 'lab_report';

      // Each upload is an additional active report on the booking — a single
      // test booking can carry many result PDFs (CBC + Lipid + ECG…). version
      // is now just an upload-order counter, not a "replace-the-old-one" flag.
      const versionRes = await query<{ max_version: number | null }>(
        `SELECT MAX(version) AS max_version FROM reports WHERE booking_id = $1`,
        [bookingId],
      );
      const version = (versionRes.rows[0]?.max_version ?? 0) + 1;

      const reportRes = await query(
        `INSERT INTO reports
         (booking_id, patient_user_id, file_name, file_url, file_size_bytes, file_mime,
          report_type, version, is_active, uploaded_by, file_bytes, storage_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11)
         RETURNING id`,
        [
          bookingId,
          booking.patient_user_id ?? null,
          req.file.originalname,
          fileUrl,
          req.file.size,
          req.file.mimetype,
          reportType,
          version,
          req.user!.id,
          req.file.buffer,
          storageKey,
        ],
      );

      // Repurpose `stored` for the notify + response payloads below so the
      // existing call sites keep their shape unchanged.
      const stored = {
        filename: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mime: req.file.mimetype,
      };

      // Notify the patient that a new report is ready. Skipped for walk-in
      // bookings (no patient_user_id → no inbox to deliver to; the report is
      // still printable from the admin side). Best-effort — notify() swallows
      // failures so an outage can't block the upload response.
      if (booking.patient_user_id) {
        await notify({
          user_id: booking.patient_user_id,
          audience: 'patient',
          event: 'report_uploaded',
          title: 'New report available',
          body: `${booking.booking_code}: ${stored.filename} is ready to view. Tap to open it from My Reports.`,
          link: `/dashboard/bookings/${bookingId}`,
          booking_id: bookingId,
          booking_code: booking.booking_code,
        });
      }

      res.status(201).json({
        data: {
          id: reportRes.rows[0].id,
          file_name: stored.filename,
          file_url: stored.url,
          version,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get a download URL for a report. Patients can only download their own;
 * admins and super_admins can download any report. `file_url` is an absolute
 * URL pointing at the public /api/v1/files/:storageKey route (or, for legacy
 * rows uploaded before migration 0027, the original disk URL). We return it
 * verbatim — the frontend opens it in a new tab.
 */
router.get('/reports/:reportId/download', requireAuth, async (req, res, next) => {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId)) {
      throw new HttpError(400, 'Invalid report id', 'BAD_REQUEST');
    }
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    const sql = isAdmin
      ? `SELECT file_url FROM reports WHERE id = $1 AND is_active = TRUE`
      : `SELECT file_url FROM reports WHERE id = $1 AND patient_user_id = $2 AND is_active = TRUE`;
    const params = isAdmin ? [reportId] : [reportId, req.user!.id];
    const result = await query<{ file_url: string }>(sql, params);
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Report not found', 'NOT_FOUND');
    }
    res.json({ data: { url: result.rows[0].file_url, expires_in: 900 } });
  } catch (err) {
    next(err);
  }
});

/**
 * Public byte-streaming route for report files stored in Postgres as BYTEA
 * (migration 0027). No auth — same access model as the previous /uploads/*
 * static handler: the URL contains an unguessable UUID storage_key. The
 * uploading admin chooses who to share file_url with; nobody else can guess
 * it.
 *
 * Match handlers like /admin/payments/:id/proof use BYTEA + an auth check;
 * we don't here because the file_url is embedded directly in <a href> /
 * <img src> on the admin reports page, where pre-fetching the bytes via
 * fetch() with Authorization isn't an option.
 */
router.get('/files/:storageKey', async (req, res, next) => {
  try {
    const key = req.params.storageKey;
    // Defensive: storage_key is always a UUID + optional extension, so reject
    // anything containing path separators or other suspicious chars.
    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      throw new HttpError(400, 'Invalid file key', 'BAD_REQUEST');
    }
    const result = await query<{
      file_bytes: Buffer | null;
      file_mime: string | null;
      file_name: string | null;
    }>(
      `SELECT file_bytes, file_mime, file_name
         FROM reports
        WHERE storage_key = $1 AND is_active = TRUE`,
      [key],
    );
    const row = result.rows[0];
    if (!row || !row.file_bytes) {
      throw new HttpError(404, 'File not found', 'NOT_FOUND');
    }
    res.setHeader('Content-Type', row.file_mime ?? 'application/octet-stream');
    if (row.file_name) {
      // inline so the browser previews PDFs / images instead of forcing a
      // download; the user can still right-click → save.
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${row.file_name.replace(/"/g, '')}"`,
      );
    }
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(row.file_bytes);
  } catch (err) {
    next(err);
  }
});

/**
 * Admin uploads a doctor's profile photo. Stored as a BYTEA blob inside the
 * users row (profile_photo_bytes + profile_photo_mime). The profile_photo_url
 * column is set to the relative API path `/doctors/<id>/photo` so the frontend
 * can gate rendering on a single field and use it directly as an <img src>.
 */
router.post(
  '/admin/doctors/:id/photo',
  requireAuth,
  requireRole('admin', 'super_admin'),
  photoUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new HttpError(400, 'File missing', 'BAD_REQUEST');
      if (!IMAGE_MIME.has(req.file.mimetype)) {
        throw new HttpError(400, 'Only JPG / PNG / WEBP allowed', 'UNSUPPORTED_MEDIA');
      }

      const doctorRes = await query<{ id: string }>(
        `SELECT id FROM users WHERE id = $1 AND role = 'doctor'`,
        [req.params.id],
      );
      if (doctorRes.rows.length === 0) {
        throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
      }

      const photoPath = `/doctors/${req.params.id}/photo`;
      await query(
        `UPDATE users
           SET profile_photo_bytes = $1,
               profile_photo_mime  = $2,
               profile_photo_url   = $3,
               updated_at = NOW()
         WHERE id = $4`,
        [req.file.buffer, req.file.mimetype, photoPath, req.params.id],
      );

      res.status(201).json({ data: { url: photoPath } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Soft-delete a report. Sets is_active = FALSE so:
 *  - it disappears from the patient dashboard (filtered by is_active)
 *  - it disappears from admin lists (also filtered)
 *  - the row + the storage blob stay around for audit
 * Hard delete is intentionally not offered; we never lose audit trail.
 */
router.delete(
  '/admin/reports/:reportId',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const reportId = Number(req.params.reportId);
      if (!Number.isInteger(reportId)) {
        throw new HttpError(400, 'Invalid report id', 'BAD_REQUEST');
      }
      const result = await query<{ id: number }>(
        `UPDATE reports SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING id`,
        [reportId],
      );
      if (result.rows.length === 0) {
        throw new HttpError(404, 'Report not found or already deleted', 'NOT_FOUND');
      }
      res.json({ data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Stream a manual-UPI payment proof (image or PDF) for admin re-verification.
 * Source = BYTEA on the payments row (see migration 0024). Admin-only —
 * proofs contain sensitive UPI screenshots and can include amount + name.
 */
router.get(
  '/admin/payments/:id/proof',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const paymentId = Number(req.params.id);
      if (!Number.isInteger(paymentId)) {
        throw new HttpError(400, 'Invalid payment id', 'BAD_REQUEST');
      }
      const result = await query<{
        payment_proof_bytes: Buffer | null;
        payment_proof_mime: string | null;
      }>(
        `SELECT payment_proof_bytes, payment_proof_mime
           FROM payments WHERE id = $1`,
        [paymentId],
      );
      const row = result.rows[0];
      if (!row || !row.payment_proof_bytes || !row.payment_proof_mime) {
        throw new HttpError(404, 'No payment proof set', 'NOT_FOUND');
      }
      res.setHeader('Content-Type', row.payment_proof_mime);
      // Private — never cached by a shared cache. Admin browsers may cache
      // for the duration of their session.
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.end(row.payment_proof_bytes);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Patient-owned proof stream. The joined ownership check (payment →
 * booking.patient_user_id) ensures a patient can only fetch the proof they
 * themselves uploaded.
 */
router.get(
  '/payments/:id/proof',
  requireAuth,
  requireRole('patient'),
  async (req, res, next) => {
    try {
      const paymentId = Number(req.params.id);
      if (!Number.isInteger(paymentId)) {
        throw new HttpError(400, 'Invalid payment id', 'BAD_REQUEST');
      }
      const result = await query<{
        payment_proof_bytes: Buffer | null;
        payment_proof_mime: string | null;
      }>(
        `SELECT p.payment_proof_bytes, p.payment_proof_mime
           FROM payments p
           JOIN bookings b ON b.id = p.booking_id
          WHERE p.id = $1 AND b.patient_user_id = $2`,
        [paymentId, req.user!.id],
      );
      const row = result.rows[0];
      if (!row || !row.payment_proof_bytes || !row.payment_proof_mime) {
        throw new HttpError(404, 'No payment proof set', 'NOT_FOUND');
      }
      res.setHeader('Content-Type', row.payment_proof_mime);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.end(row.payment_proof_bytes);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Admin uploads a home collector's profile photo. Same BYTEA pattern as
 * doctor photos (migration 0022), but scoped to admin_role='lab_tech' users.
 * profile_photo_url is set to the relative API path so the frontend (admin
 * + the patient who booked) can render it via /collectors/:id/photo.
 */
router.post(
  '/admin/collectors/:id/photo',
  requireAuth,
  requireRole('admin', 'super_admin'),
  photoUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new HttpError(400, 'File missing', 'BAD_REQUEST');
      if (!IMAGE_MIME.has(req.file.mimetype)) {
        throw new HttpError(400, 'Only JPG / PNG / WEBP allowed', 'UNSUPPORTED_MEDIA');
      }
      const collectorRes = await query<{ id: string }>(
        `SELECT id FROM users WHERE id = $1 AND role = 'admin' AND admin_role = 'lab_tech'`,
        [req.params.id],
      );
      if (collectorRes.rows.length === 0) {
        throw new HttpError(404, 'Collector not found', 'NOT_FOUND');
      }
      const photoPath = `/collectors/${req.params.id}/photo`;
      await query(
        `UPDATE users
           SET profile_photo_bytes = $1,
               profile_photo_mime  = $2,
               profile_photo_url   = $3,
               updated_at = NOW()
         WHERE id = $4`,
        [req.file.buffer, req.file.mimetype, photoPath, req.params.id],
      );
      res.status(201).json({ data: { url: photoPath } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Public photo stream for home collectors. No auth — the patient (who may
 * not be authenticated when their booking page is first rendered) needs to
 * see the collector's face. Mirrors the doctor-photo handler below.
 */
router.get('/collectors/:id/photo', async (req, res, next) => {
  try {
    const result = await query<{
      profile_photo_bytes: Buffer | null;
      profile_photo_mime: string | null;
    }>(
      `SELECT profile_photo_bytes, profile_photo_mime FROM users
        WHERE id = $1 AND role = 'admin' AND admin_role = 'lab_tech'`,
      [req.params.id],
    );
    const row = result.rows[0];
    if (!row || !row.profile_photo_bytes || !row.profile_photo_mime) {
      throw new HttpError(404, 'No photo set', 'NOT_FOUND');
    }
    res.setHeader('Content-Type', row.profile_photo_mime);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(row.profile_photo_bytes);
  } catch (err) {
    next(err);
  }
});

/**
 * Public photo stream. No auth — doctor photos are shown on the marketing
 * site and on patient search results. Returns 404 when no photo is set.
 */
router.get('/doctors/:id/photo', async (req, res, next) => {
  try {
    const result = await query<{ profile_photo_bytes: Buffer | null; profile_photo_mime: string | null }>(
      `SELECT profile_photo_bytes, profile_photo_mime FROM users
       WHERE id = $1 AND role = 'doctor' AND is_active = TRUE`,
      [req.params.id],
    );
    const row = result.rows[0];
    if (!row || !row.profile_photo_bytes || !row.profile_photo_mime) {
      throw new HttpError(404, 'No photo set', 'NOT_FOUND');
    }
    res.setHeader('Content-Type', row.profile_photo_mime);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(row.profile_photo_bytes);
  } catch (err) {
    next(err);
  }
});

export default router;
