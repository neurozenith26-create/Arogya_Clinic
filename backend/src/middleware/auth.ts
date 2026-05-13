import type { NextFunction, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { verifyJwt } from '../lib/jwt.js';
import { HttpError } from './errorHandler.js';

export interface AuthUser {
  id: string;
  role: 'patient' | 'doctor' | 'admin' | 'super_admin';
  email: string | null;
  mobile: string | null;
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
    }>('SELECT id, role, email, mobile, is_active FROM users WHERE id = $1', [payload.sub]);

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
