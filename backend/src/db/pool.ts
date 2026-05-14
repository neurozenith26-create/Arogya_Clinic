import pg from 'pg';
import { env } from '../config/env.js';

// Keep DATE (OID 1082) as a 'YYYY-MM-DD' string instead of a JS Date.
// Default pg behavior parses DATE into a local-midnight Date which then
// JSON-serializes to a UTC ISO timestamp (e.g. '2026-05-14T18:30:00.000Z'
// for a date stored as 2026-05-15 in IST), surfacing as junk in the UI and
// breaking the shared zod schemas that expect a plain 'YYYY-MM-DD' string.
pg.types.setTypeParser(1082, (val) => val);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
