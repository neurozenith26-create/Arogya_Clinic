import { env } from '../config/env.js';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

/**
 * OTP store backed by an in-process Map. Adequate for single-instance dev/MVP.
 *
 * Production: replace with a Redis adapter — keep the same interface
 * (issue / verify / clear) so call sites don't need to change.
 */
class OtpStore {
  private map = new Map<string, OtpEntry>();

  /** Issue a 6-digit OTP for the given identifier (mobile or email). */
  issue(identifier: string): string {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.map.set(identifier, {
      code,
      expiresAt: Date.now() + env.OTP_EXPIRY_MINUTES * 60_000,
      attempts: 0,
    });
    return code;
  }

  /** Verify an OTP. Returns { ok, reason } describing the result. */
  verify(identifier: string, code: string): { ok: true } | { ok: false; reason: string } {
    const entry = this.map.get(identifier);
    if (!entry) return { ok: false, reason: 'No OTP requested for this identifier' };
    if (Date.now() > entry.expiresAt) {
      this.map.delete(identifier);
      return { ok: false, reason: 'OTP expired — please request a new one' };
    }
    entry.attempts += 1;
    if (entry.attempts > env.OTP_MAX_ATTEMPTS) {
      this.map.delete(identifier);
      return { ok: false, reason: 'Too many incorrect attempts — request a new OTP' };
    }
    if (entry.code !== code) {
      return { ok: false, reason: 'Incorrect OTP' };
    }
    this.map.delete(identifier);
    return { ok: true };
  }

  /** Clear an OTP (called after successful verify or on logout). */
  clear(identifier: string): void {
    this.map.delete(identifier);
  }
}

export const otpStore = new OtpStore();
