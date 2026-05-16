import type { NextFunction, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { verifyJwt } from '../lib/jwt.js';
import { HttpError } from './errorHandler.js';

export interface AuthUser {
  id: string;
  role: 'patient' | 'doctor' | 'admin' | 'super_admin';
  email: string | null;
  mobile: string | null;
  /**
   * Branch this user is scoped to. Non-null only for role='admin' (branch admin).
   * NULL for super_admin (sees all branches), patient, doctor.
   */
  branch_id: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies a Bearer JWT issued by THIS backend (no external auth provider).
 * Then re-reads the user row from the DB to confirm they're still active and
 * to pick up any role changes since the token was issued.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing or malformed Authorization header', 'UNAUTHORIZED');
    }
    const token = authHeader.slice('Bearer '.length).trim();

    let payload;
    try {
      payload = verifyJwt(token);
    } catch {
      throw new HttpError(401, 'Invalid or expired token', 'UNAUTHORIZED');
    }

    const result = await query<{
      id: string;
      role: AuthUser['role'];
      email: string | null;
      mobile: string | null;
      is_active: boolean;
      branch_id: number | null;
    }>(
      'SELECT id, role, email, mobile, is_active, branch_id FROM users WHERE id = $1',
      [payload.sub],
    );

    if (result.rows.length === 0) {
      throw new HttpError(401, 'User no longer exists', 'UNAUTHORIZED');
    }
    const row = result.rows[0];
    if (!row.is_active) {
      throw new HttpError(403, 'Account is disabled', 'ACCOUNT_DISABLED');
    }

    req.user = {
      id: row.id,
      role: row.role,
      email: row.email,
      mobile: row.mobile,
      branch_id: row.branch_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: AuthUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, 'Authentication required', 'UNAUTHORIZED'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new HttpError(403, 'You do not have permission for this action', 'FORBIDDEN'));
      return;
    }
    next();
  };
}

/** Sugar for super_admin-only endpoints (branch admin management). */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Returns the branch_id to filter admin reads by.
 *
 * - role='admin'        → always req.user.branch_id (query-param tampering ignored)
 * - role='super_admin'  → req.query.branch_id if present and valid; otherwise null
 *                         (the "All branches" view)
 *
 * Callers should treat a null return value as "no branch filter — return rows
 * from every branch". For role='admin' this never happens (they always have a
 * branch_id pinned at login).
 */
export function scopedBranchFilter(req: Request): number | null {
  if (!req.user) return null;
  if (req.user.role === 'admin') {
    return req.user.branch_id;
  }
  if (req.user.role === 'super_admin') {
    const raw = req.query.branch_id;
    if (raw === undefined || raw === null || raw === '' || raw === 'all') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  // patient/doctor — only used in their own contexts, not admin reads
  return null;
}

/**
 * View-only guard for super_admin. Place AFTER `requireAuth` (and any
 * `requireRole('admin','super_admin')`) on every admin write endpoint.
 *
 * super_admin's writes are confined to /admin/branch-admins/* (account
 * management). Every other admin write is the branch admin's job.
 */
export function enforceBranchAdminWrite(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new HttpError(401, 'Authentication required', 'UNAUTHORIZED'));
    return;
  }
  if (req.user.role === 'super_admin') {
    next(
      new HttpError(
        403,
        'Super admin is view-only. Only branch admins can modify branch data.',
        'SUPER_ADMIN_READ_ONLY',
      ),
    );
    return;
  }
  next();
}
