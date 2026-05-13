import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

/**
 * Hash a plaintext password using bcrypt.
 * Cost factor configurable via BCRYPT_ROUNDS env (default: 10).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 * Returns true if matched, false otherwise.
 */
export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
