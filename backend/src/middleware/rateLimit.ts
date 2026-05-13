import rateLimit from 'express-rate-limit';

/**
 * Tight limiter for public write endpoints (contact form, reviews).
 * 5 requests per minute per IP.
 */
export const publicWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});

/**
 * General API limiter — generous, just to catch runaway clients.
 * 200 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
