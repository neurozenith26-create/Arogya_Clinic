import type { PoolClient } from 'pg';
import { query } from '../db/pool.js';
import { logger } from './logger.js';

/**
 * Insert a notification row. Fire-and-forget — failures are logged but do
 * not propagate to the caller (so a notification outage can never block the
 * underlying business action).
 *
 * If `client` is supplied, the insert runs inside that transaction; otherwise
 * a standalone pool query is used. Pass the client when you want the
 * notification + the domain change to commit/rollback together (e.g. issuing
 * a "payment re-verified" notification inside the re-verify transaction).
 */
export interface NotifyArgs {
  user_id: string | null;
  audience: 'admin' | 'patient' | 'collector';
  event: string;
  title: string;
  body?: string | null;
  link?: string | null;
  booking_id?: number | null;
  booking_code?: string | null;
}

export async function notify(args: NotifyArgs, client?: PoolClient): Promise<void> {
  const sql = `INSERT INTO notifications
      (user_id, audience, event, title, body, link, booking_id, booking_code)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
  const params = [
    args.user_id,
    args.audience,
    args.event,
    args.title,
    args.body ?? null,
    args.link ?? null,
    args.booking_id ?? null,
    args.booking_code ?? null,
  ];
  try {
    if (client) {
      await client.query(sql, params);
    } else {
      await query(sql, params);
    }
  } catch (err) {
    logger.warn({ err, args }, 'notify() failed — continuing');
  }
}
