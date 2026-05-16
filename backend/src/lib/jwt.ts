import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  /** users.id (our own UUID, not any external provider's id) */
  sub: string;
  role: 'patient' | 'doctor' | 'admin' | 'super_admin';
  email?: string | null;
  mobile?: string | null;
  /**
   * For branch admins (role='admin'): the branch they manage.
   * NULL/undefined for super_admin (sees all), patient, doctor.
   * The middleware ultimately re-reads this from the DB on every request,
   * so a token claim cannot escalate access — this field is informational.
   */
  branch_id?: number | null;
}

/**
 * Sign a JWT containing the user identity. Expiry comes from JWT_EXPIRES_IN.
 */
export function signJwt(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verify a JWT and return its payload. Throws if invalid or expired.
 */
export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid JWT payload');
  }
  return decoded as JwtPayload;
}
