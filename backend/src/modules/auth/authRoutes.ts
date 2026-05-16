import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { signJwt } from '../../lib/jwt.js';
import { otpStore } from '../../lib/otpStore.js';
import { logger } from '../../lib/logger.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/auth.js';

const router: ExpressRouter = Router();

// Strong policy used only at signup / change-password — login just verifies whatever is stored.
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(128);
// Login only requires "something non-empty" — we let bcrypt.compare decide if it's right.
const loginPasswordSchema = z.string().min(1, 'Password is required').max(128);
const mobileSchema = z.string().regex(/^[6-9][0-9]{9}$/, 'Invalid Indian mobile number');
const emailSchema = z.string().email('Invalid email');

/* ── Signup (patient) ────────────────────────────────────────────────── */

const signupSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(1).max(100),
  mobile: mobileSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
});

router.post('/auth/signup', async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);

    // Check for existing user by mobile or email
    const existing = await query<{ id: string }>(
      `SELECT id FROM users WHERE mobile = $1 OR (email IS NOT NULL AND email = $2)`,
      [data.mobile, data.email ?? null],
    );
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'An account already exists with this mobile or email', 'DUPLICATE');
    }

    const password_hash = await hashPassword(data.password);

    const result = await query<{
      id: string;
      role: 'patient';
      email: string | null;
      mobile: string;
      branch_id: number | null;
    }>(
      `INSERT INTO users
         (role, first_name, last_name, mobile, email, password_hash, is_login_enabled)
       VALUES ('patient', $1, $2, $3, $4, $5, TRUE)
       RETURNING id, role, email, mobile, branch_id`,
      [data.first_name, data.last_name, data.mobile, data.email ?? null, password_hash],
    );

    const user = result.rows[0];
    const token = signJwt({
      sub: user.id,
      role: user.role,
      email: user.email,
      mobile: user.mobile,
      branch_id: user.branch_id,
    });

    res.status(201).json({
      data: {
        token,
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          mobile: user.mobile,
          branch_id: user.branch_id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ── Login with email + password ─────────────────────────────────────── */

const loginEmailSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const data = loginEmailSchema.parse(req.body);
    const result = await query<{
      id: string;
      role: 'patient' | 'doctor' | 'admin' | 'super_admin';
      email: string | null;
      mobile: string | null;
      password_hash: string | null;
      is_active: boolean;
      is_login_enabled: boolean;
      branch_id: number | null;
    }>(
      `SELECT id, role, email, mobile, password_hash, is_active, is_login_enabled, branch_id
       FROM users WHERE email = $1`,
      [data.email.toLowerCase()],
    );
    if (result.rows.length === 0) {
      throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    const user = result.rows[0];
    if (!user.is_active || !user.is_login_enabled) {
      throw new HttpError(403, 'Account is disabled', 'ACCOUNT_DISABLED');
    }
    if (!user.password_hash) {
      throw new HttpError(401, 'Password login not enabled — use OTP', 'NO_PASSWORD');
    }
    const ok = await verifyPassword(data.password, user.password_hash);
    if (!ok) {
      throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }
    await query('UPDATE users SET last_login_at = NOW(), failed_login_count = 0 WHERE id = $1', [
      user.id,
    ]);
    const token = signJwt({
      sub: user.id,
      role: user.role,
      email: user.email,
      mobile: user.mobile,
      branch_id: user.branch_id,
    });
    res.json({
      data: {
        token,
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          mobile: user.mobile,
          branch_id: user.branch_id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ── OTP login flow ──────────────────────────────────────────────────── */

router.post('/auth/otp/send', async (req, res, next) => {
  try {
    const { mobile } = z.object({ mobile: mobileSchema }).parse(req.body);
    const code = otpStore.issue(mobile);
    // Production: send via MSG91 here. Dev: log it so it shows in console.
    logger.info({ mobile, code }, '[DEV] OTP issued');
    res.json({
      data: {
        sent: true,
        // In development mode we echo the code back so dev/demo can see it.
        // Strip this in production.
        debug_code: process.env.NODE_ENV === 'production' ? undefined : code,
      },
    });
  } catch (err) {
    next(err);
  }
});

const otpVerifySchema = z.object({
  mobile: mobileSchema,
  code: z.string().regex(/^\d{6}$/, '6-digit OTP required'),
  /** If user doesn't exist, these create the account on first verify. */
  first_name: z.string().min(2).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
});

router.post('/auth/otp/verify', async (req, res, next) => {
  try {
    const data = otpVerifySchema.parse(req.body);
    const verifyResult = otpStore.verify(data.mobile, data.code);
    if (!verifyResult.ok) {
      throw new HttpError(401, verifyResult.reason, 'INVALID_OTP');
    }

    let userRes = await query<{
      id: string;
      role: 'patient' | 'doctor' | 'admin' | 'super_admin';
      email: string | null;
      mobile: string | null;
      is_active: boolean;
      branch_id: number | null;
    }>(
      `SELECT id, role, email, mobile, is_active, branch_id FROM users WHERE mobile = $1`,
      [data.mobile],
    );

    if (userRes.rows.length === 0) {
      // First-time login via OTP — auto-create a patient account
      userRes = await query(
        `INSERT INTO users (role, first_name, last_name, mobile, is_login_enabled)
         VALUES ('patient', $1, $2, $3, TRUE)
         RETURNING id, role, email, mobile, is_active, branch_id`,
        [data.first_name ?? 'Patient', data.last_name ?? '', data.mobile],
      );
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      throw new HttpError(403, 'Account is disabled', 'ACCOUNT_DISABLED');
    }
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    const token = signJwt({
      sub: user.id,
      role: user.role,
      email: user.email,
      mobile: user.mobile,
      branch_id: user.branch_id,
    });
    res.json({
      data: {
        token,
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          mobile: user.mobile,
          branch_id: user.branch_id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ── Current user ────────────────────────────────────────────────────── */

router.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, role, email, mobile, first_name, last_name, is_active, is_login_enabled,
              date_of_birth, gender, default_address, alternative_number,
              speciality, qualifications, consultation_fee, about,
              admin_role, permissions, branch_id, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user!.id],
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ── Logout (client clears the token; server is stateless) ───────────── */

router.post('/auth/logout', (_req, res) => {
  // JWTs are stateless. For real revocation, maintain a blacklist or rotate keys.
  res.json({ data: { ok: true } });
});

/* ── Change password ─────────────────────────────────────────────────── */

const changePasswordSchema = z.object({
  current_password: passwordSchema.optional(), // optional if user only had OTP
  new_password: passwordSchema,
});

router.post('/auth/change-password', requireAuth, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const userRes = await query<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.id],
    );
    if (userRes.rows.length === 0) throw new HttpError(404, 'User not found', 'NOT_FOUND');

    const currentHash = userRes.rows[0].password_hash;
    if (currentHash) {
      if (!data.current_password) {
        throw new HttpError(400, 'Current password required', 'BAD_REQUEST');
      }
      const ok = await verifyPassword(data.current_password, currentHash);
      if (!ok) throw new HttpError(401, 'Current password incorrect', 'INVALID_CREDENTIALS');
    }
    const newHash = await hashPassword(data.new_password);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newHash,
      req.user!.id,
    ]);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
