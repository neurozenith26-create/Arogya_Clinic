import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { publicWriteLimiter } from '../../middleware/rateLimit.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router: ExpressRouter = Router();

// ─── Service catalog ────────────────────────────────────────────────────────────

router.get('/services', async (req, res, next) => {
  try {
    const categorySlug = req.query.category_slug as string | undefined;
    const search = req.query.q as string | undefined;

    let sql = `
      SELECT s.id, s.name, s.slug, s.short_description, s.price,
             s.sample_type, s.report_turnaround_hours, s.is_package,
             c.name AS category_name, c.slug AS category_slug
      FROM services s
      JOIN service_categories c ON c.id = s.category_id
      WHERE s.is_active = TRUE AND c.is_active = TRUE
    `;
    const params: unknown[] = [];
    if (categorySlug) {
      params.push(categorySlug);
      sql += ` AND c.slug = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND s.name ILIKE $${params.length}`;
    }
    sql += ' ORDER BY c.display_order, s.name LIMIT 200';

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/services/:slug', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, c.name AS category_name, c.slug AS category_slug
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       WHERE s.slug = $1 AND s.is_active = TRUE`,
      [req.params.slug],
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Service not found', 'NOT_FOUND');
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/service-categories', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, slug, icon_url, banner_url, display_order
       FROM service_categories
       WHERE is_active = TRUE
       ORDER BY display_order, name`,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── Doctors ────────────────────────────────────────────────────────────────────

router.get('/doctors', async (req, res, next) => {
  try {
    const departmentId = req.query.department_id as string | undefined;
    const search = req.query.q as string | undefined;

    let sql = `
      SELECT u.id, u.first_name, u.last_name, u.profile_photo_url,
             u.speciality, u.qualifications, u.consultation_fee,
             u.about, u.is_verified, u.offers_home_visit,
             u.rating_avg, u.rating_count,
             d.id AS department_id, d.name AS department_name, d.slug AS department_slug
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.role = 'doctor' AND u.is_active = TRUE AND u.is_verified = TRUE
    `;
    const params: unknown[] = [];
    if (departmentId) {
      params.push(departmentId);
      sql += ` AND u.department_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.speciality ILIKE $${params.length})`;
    }
    sql += ' ORDER BY u.rating_avg DESC, u.first_name LIMIT 100';

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/doctors/:id', async (req, res, next) => {
  try {
    const doctorResult = await query(
      `SELECT u.id, u.first_name, u.last_name, u.profile_photo_url,
              u.speciality, u.qualifications, u.consultation_fee,
              u.about, u.education_training, u.is_verified, u.offers_home_visit,
              u.rating_avg, u.rating_count,
              d.id AS department_id, d.name AS department_name, d.slug AS department_slug
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1 AND u.role = 'doctor' AND u.is_active = TRUE`,
      [req.params.id],
    );
    if (doctorResult.rows.length === 0) {
      throw new HttpError(404, 'Doctor not found', 'NOT_FOUND');
    }
    const centersResult = await query(
      `SELECT id, center_name, address, phone, map_link, city, pincode,
              consultation_fee_override
       FROM doctor_centers
       WHERE doctor_user_id = $1 AND is_active = TRUE`,
      [req.params.id],
    );
    res.json({ data: { ...doctorResult.rows[0], centers: centersResult.rows } });
  } catch (err) {
    next(err);
  }
});

// ─── Departments ────────────────────────────────────────────────────────────────

router.get('/departments', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, slug, description, icon_url, banner_url, display_order
       FROM departments
       WHERE is_active = TRUE
       ORDER BY display_order, name`,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/departments/:slug', async (req, res, next) => {
  try {
    const deptResult = await query(
      `SELECT * FROM departments WHERE slug = $1 AND is_active = TRUE`,
      [req.params.slug],
    );
    if (deptResult.rows.length === 0) {
      throw new HttpError(404, 'Department not found', 'NOT_FOUND');
    }
    res.json({ data: deptResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── Enquiries ──────────────────────────────────────────────────────────────────

const enquirySchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  subject: z.string().min(2).max(255).optional(),
  message: z.string().min(5).max(5000),
});

router.post('/enquiries', publicWriteLimiter, async (req, res, next) => {
  try {
    const data = enquirySchema.parse(req.body);
    const result = await query(
      `INSERT INTO enquiries (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [data.name, data.email ?? null, data.phone ?? null, data.subject ?? null, data.message],
    );
    res.status(201).json({ data: { id: result.rows[0].id } });
  } catch (err) {
    next(err);
  }
});

// ─── Reviews ────────────────────────────────────────────────────────────────────

const reviewSchema = z.object({
  doctor_id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(2000),
  guest_name: z.string().min(2).max(100).optional(),
});

router.post('/reviews', publicWriteLimiter, async (req, res, next) => {
  try {
    const data = reviewSchema.parse(req.body);
    const result = await query(
      `INSERT INTO reviews (doctor_user_id, rating, comment, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [data.doctor_id ?? null, data.rating, data.comment],
    );
    res.status(201).json({ data: { id: result.rows[0].id, status: 'pending_moderation' } });
  } catch (err) {
    next(err);
  }
});

router.get('/reviews', async (req, res, next) => {
  try {
    const doctorId = req.query.doctor_id as string | undefined;
    let sql = `
      SELECT r.id, r.rating, r.comment, r.clinic_reply, r.replied_at, r.created_at,
             u.first_name AS patient_first_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.patient_user_id
      WHERE r.status = 'approved'
    `;
    const params: unknown[] = [];
    if (doctorId) {
      params.push(doctorId);
      sql += ` AND r.doctor_user_id = $${params.length}`;
    }
    sql += ' ORDER BY r.created_at DESC LIMIT 50';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
