import type { NextFunction, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { logger } from '../lib/logger.js';

/**
 * Automatic audit-log middleware.
 *
 * Hooks res.on('finish') to write one row into audit_log (migration 0016)
 * for every successful authenticated mutating request. Runs AFTER the
 * response is sent so it never blocks the user, and best-efforts insertion
 * so an audit failure can never break the real action.
 *
 * What gets logged:
 *  - Method is POST / PATCH / PUT / DELETE
 *  - Status is 2xx
 *  - req.user is set (i.e. requireAuth populated it; public routes are silent)
 *
 * Action names are derived from the URL by stripping /api/v1[/admin], pulling
 * the entity segment, optional :id, and an optional sub-action segment. Examples:
 *   POST   /api/v1/admin/services             → services.create
 *   PATCH  /api/v1/admin/services/14          → services.update
 *   DELETE /api/v1/admin/services/14          → services.delete
 *   POST   /api/v1/admin/payments/42/re-verify → payments.re-verify (entity_id=42)
 *   PATCH  /api/v1/admin/bookings/3/status    → bookings.status (entity_id=3)
 *   POST   /api/v1/bookings/test (patient)    → bookings.test
 *   POST   /api/v1/bookings/9/cancel          → bookings.cancel (entity_id=9)
 */

const VERB: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

interface Classified {
  action: string;
  entity_type: string;
  entity_id: string | null;
}

function classify(method: string, path: string): Classified | null {
  // Drop /api/v1 prefix, trim slashes.
  let p = path.replace(/^\/api\/v1/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!p) return null;
  const all = p.split('/');
  // Hide the /admin namespace from the action name — we want `services.create`,
  // not `admin.services.create`.
  const segs = all[0] === 'admin' ? all.slice(1) : all;
  if (segs.length === 0) return null;

  const entity_type = segs[0];
  let i = 1;
  let entity_id: string | null = null;
  // Treat a numeric or UUID-shaped segment as the entity id.
  if (segs[i] && /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(segs[i])) {
    entity_id = segs[i];
    i += 1;
  }
  const subAction = segs.slice(i).filter(Boolean).join('.');
  const verb = subAction || VERB[method] || method.toLowerCase();
  return { action: `${entity_type}.${verb}`, entity_type, entity_id };
}

// Endpoints we never want in the audit log. Login/signup/me are noisy and
// the audit page itself + dashboard/analytics are read-only metadata routes
// that some other handler (e.g. /webhooks) handles its own logging needs.
const SKIP_PATTERNS: RegExp[] = [
  /^\/api\/v1\/auth\//,
  /^\/api\/v1\/me$/,
  /^\/api\/v1\/health$/,
  /^\/api\/v1\/webhooks\//,
  /^\/api\/v1\/admin\/audit-log$/,
];

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    try {
      // Only audit mutating, successful, authenticated requests.
      if (!req.user) return;
      const method = req.method.toUpperCase();
      if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (SKIP_PATTERNS.some((re) => re.test(req.path))) return;

      const cls = classify(method, req.path);
      if (!cls) return;

      // Clip the user-agent so a malformed/giant UA can't blow the column.
      const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 500);
      // req.ip respects trust proxy if configured; otherwise it's the socket IP.
      const ip = (req.ip ?? '').slice(0, 45);

      // Fire-and-forget; failures are logged but never propagated.
      query(
        `INSERT INTO audit_log
           (actor_user_id, actor_role, action, entity_type, entity_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          req.user.role,
          cls.action,
          cls.entity_type,
          cls.entity_id,
          ip || null,
          ua || null,
        ],
      ).catch((err: unknown) => {
        logger.warn({ err, path: req.path, method }, 'audit_log insert failed');
      });
    } catch (err) {
      logger.warn({ err, path: req.path }, 'audit middleware threw');
    }
  });
  next();
}
