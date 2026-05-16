import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { query, transaction } from '../../db/pool.js';
import { hashPassword } from '../../lib/passwords.js';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router: ExpressRouter = Router();

// ─── Public: list active branches (for patient branch picker + super-admin dropdown)

router.get('/public/branches', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, branch_code, name, address_line1, address_line2,
              city, state, pincode, phone, email, business_hours
         FROM branches
        WHERE is_active = TRUE
        ORDER BY id ASC`,
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: branch admin (= branch + its admin) management
// Super-admin only. Branch info is captured inline with the admin account —
// per the client, super admin "only creates the accounts" and the branch
// details live alongside.

const branchFieldsSchema = z.object({
  branch_code: z.string().trim().min(3).max(20),
  name: z.string().trim().min(2).max(150),
  address_line1: z.string().trim().min(2).max(255),
  address_line2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Must be a 6-digit Indian pincode'),
  phone: z.string().trim().min(7).max(15),
  email: z.string().email().nullable().optional(),
  gstin: z.string().trim().max(20).nullable().optional(),
  upi_id: z.string().trim().max(100).nullable().optional(),
  upi_payee_name: z.string().trim().max(100).nullable().optional(),
  business_hours: z.record(z.unknown()).nullable().optional(),
});

const adminFieldsSchema = z.object({
  email: z.string().email(),
  mobile: z.string().regex(/^(\+91)?[6-9][0-9]{9}$/, 'Invalid Indian mobile'),
  first_name: z.string().trim().min(2).max(100),
  last_name: z.string().trim().min(1).max(100),
  password: z.string().min(6).max(128),
});

const createSchema = z.object({
  branch: branchFieldsSchema,
  admin: adminFieldsSchema,
});

router.get('/admin/branch-admins', requireAuth, requireSuperAdmin, async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT
          b.id                AS branch_id,
          b.branch_code,
          b.name              AS branch_name,
          b.address_line1, b.address_line2,
          b.city, b.state, b.pincode,
          b.phone             AS branch_phone,
          b.email             AS branch_email,
          b.gstin, b.upi_id, b.upi_payee_name, b.business_hours,
          b.is_active         AS branch_is_active,
          u.id                AS admin_id,
          u.email             AS admin_email,
          u.mobile            AS admin_mobile,
          u.first_name        AS admin_first_name,
          u.last_name         AS admin_last_name,
          u.is_active         AS admin_is_active,
          u.last_login_at     AS admin_last_login_at,
          b.created_at, b.updated_at
        FROM branches b
        LEFT JOIN users u
               ON u.branch_id = b.id
              AND u.role = 'admin'
              AND u.is_active = TRUE
        ORDER BY b.id ASC`,
    );
    const data = result.rows.map((r) => ({
      branch: {
        id: r.branch_id,
        branch_code: r.branch_code,
        name: r.branch_name,
        address_line1: r.address_line1,
        address_line2: r.address_line2,
        city: r.city,
        state: r.state,
        pincode: r.pincode,
        phone: r.branch_phone,
        email: r.branch_email,
        gstin: r.gstin,
        upi_id: r.upi_id,
        upi_payee_name: r.upi_payee_name,
        business_hours: r.business_hours,
        is_active: r.branch_is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
      admin: r.admin_id
        ? {
            id: r.admin_id,
            email: r.admin_email,
            mobile: r.admin_mobile,
            first_name: r.admin_first_name,
            last_name: r.admin_last_name,
            is_active: r.admin_is_active,
            last_login_at: r.admin_last_login_at,
          }
        : null,
    }));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/branch-admins', requireAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const normalizedMobile = data.admin.mobile.startsWith('+')
      ? data.admin.mobile
      : `+91${data.admin.mobile}`;

    // Pre-check uniqueness for friendlier errors
    const dupBranch = await query<{ id: number }>(
      `SELECT id FROM branches WHERE branch_code = $1`,
      [data.branch.branch_code],
    );
    if (dupBranch.rows.length > 0) {
      throw new HttpError(
        409,
        `Branch code "${data.branch.branch_code}" already exists.`,
        'DUPLICATE_BRANCH_CODE',
      );
    }
    const dupUser = await query<{ id: string }>(
      `SELECT id FROM users
        WHERE (email IS NOT NULL AND email = $1) OR (mobile = $2 AND is_active = TRUE)`,
      [data.admin.email.toLowerCase(), normalizedMobile],
    );
    if (dupUser.rows.length > 0) {
      throw new HttpError(
        409,
        'An account already exists with this email or mobile.',
        'DUPLICATE_USER',
      );
    }

    const password_hash = await hashPassword(data.admin.password);

    const result = await transaction(async (client) => {
      const branchInsert = await client.query<{ id: number }>(
        `INSERT INTO branches
           (branch_code, name, address_line1, address_line2,
            city, state, pincode, phone, email, gstin,
            upi_id, upi_payee_name, business_hours, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
         RETURNING id`,
        [
          data.branch.branch_code,
          data.branch.name,
          data.branch.address_line1,
          data.branch.address_line2 ?? null,
          data.branch.city,
          data.branch.state,
          data.branch.pincode,
          data.branch.phone,
          data.branch.email ?? null,
          data.branch.gstin ?? null,
          data.branch.upi_id ?? null,
          data.branch.upi_payee_name ?? null,
          data.branch.business_hours ? JSON.stringify(data.branch.business_hours) : null,
        ],
      );
      const branchId = branchInsert.rows[0].id;

      const adminInsert = await client.query<{ id: string }>(
        `INSERT INTO users
           (role, admin_role, branch_id,
            email, mobile, first_name, last_name,
            is_active, is_login_enabled,
            permissions, password_hash)
         VALUES ('admin', 'admin', $1,
                 $2, $3, $4, $5,
                 TRUE, TRUE,
                 '{"bookings":["view","edit","delete"],"reports":["view","upload","delete"],"payments":["view","refund"],"users":["view","create","edit","delete"],"settings":["view","edit"]}'::jsonb,
                 $6)
         RETURNING id`,
        [
          branchId,
          data.admin.email.toLowerCase(),
          normalizedMobile,
          data.admin.first_name,
          data.admin.last_name,
          password_hash,
        ],
      );
      return { branchId, adminId: adminInsert.rows[0].id };
    });

    res.status(201).json({ data: result });
  } catch (err) {
    // Surface the partial unique-index violation as a 409
    if (err instanceof Error && /users_one_active_admin_per_branch/.test(err.message)) {
      next(
        new HttpError(
          409,
          'This branch already has an active admin. Disable the existing one first.',
          'BRANCH_HAS_ACTIVE_ADMIN',
        ),
      );
      return;
    }
    next(err);
  }
});

const updateSchema = z.object({
  branch: branchFieldsSchema.partial().optional(),
  admin: adminFieldsSchema
    .partial()
    .omit({ password: true })
    .extend({
      password: z.string().min(6).max(128).optional(),
      is_active: z.boolean().optional(),
    })
    .optional(),
});

router.patch(
  '/admin/branch-admins/:adminUserId',
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const adminUserId = req.params.adminUserId;
      const data = updateSchema.parse(req.body);

      // Look up the admin + their branch
      const adminRow = await query<{ id: string; branch_id: number | null; role: string }>(
        `SELECT id, branch_id, role FROM users WHERE id = $1`,
        [adminUserId],
      );
      if (adminRow.rows.length === 0 || adminRow.rows[0].role !== 'admin') {
        throw new HttpError(404, 'Branch admin not found', 'NOT_FOUND');
      }
      const branchId = adminRow.rows[0].branch_id;
      if (!branchId) {
        throw new HttpError(400, 'Branch admin is not linked to a branch', 'BAD_REQUEST');
      }

      await transaction(async (client) => {
        // ── Branch fields ────────────────────────────────────────────────
        if (data.branch && Object.keys(data.branch).length > 0) {
          const entries = Object.entries(data.branch).filter(([, v]) => v !== undefined);
          if (entries.length > 0) {
            const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
            const values = entries.map(([k, v]) =>
              k === 'business_hours' && v ? JSON.stringify(v) : v ?? null,
            );
            await client.query(
              `UPDATE branches SET ${sets}, updated_at = NOW() WHERE id = $1`,
              [branchId, ...values],
            );
          }
        }

        // ── Admin user fields ───────────────────────────────────────────
        if (data.admin) {
          const adminPatch: Record<string, unknown> = {};
          if (data.admin.first_name !== undefined) adminPatch.first_name = data.admin.first_name;
          if (data.admin.last_name !== undefined) adminPatch.last_name = data.admin.last_name;
          if (data.admin.email !== undefined) adminPatch.email = data.admin.email.toLowerCase();
          if (data.admin.mobile !== undefined) {
            adminPatch.mobile = data.admin.mobile.startsWith('+')
              ? data.admin.mobile
              : `+91${data.admin.mobile}`;
          }
          if (data.admin.is_active !== undefined) {
            adminPatch.is_active = data.admin.is_active;
            adminPatch.is_login_enabled = data.admin.is_active;
          }
          if (data.admin.password !== undefined) {
            adminPatch.password_hash = await hashPassword(data.admin.password);
          }
          const entries = Object.entries(adminPatch);
          if (entries.length > 0) {
            const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
            const values = entries.map(([, v]) => v);
            await client.query(
              `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1`,
              [adminUserId, ...values],
            );
          }
        }
      });

      res.json({ data: { ok: true } });
    } catch (err) {
      if (err instanceof Error && /users_one_active_admin_per_branch/.test(err.message)) {
        next(
          new HttpError(
            409,
            'This branch already has an active admin.',
            'BRANCH_HAS_ACTIVE_ADMIN',
          ),
        );
        return;
      }
      next(err);
    }
  },
);

router.delete(
  '/admin/branch-admins/:adminUserId',
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const adminUserId = req.params.adminUserId;
      const result = await query(
        `UPDATE users
            SET is_active = FALSE,
                is_login_enabled = FALSE,
                updated_at = NOW()
          WHERE id = $1 AND role = 'admin'
          RETURNING id`,
        [adminUserId],
      );
      if (result.rows.length === 0) {
        throw new HttpError(404, 'Branch admin not found', 'NOT_FOUND');
      }
      res.json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
