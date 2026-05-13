import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/pool.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>('SELECT filename FROM _migrations');
  return new Set(result.rows.map((r) => r.filename));
}

async function run() {
  logger.info({ dir: MIGRATIONS_DIR }, 'Running migrations');
  await ensureMigrationsTable();
  const applied = await getApplied();

  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (applied.has(filename)) {
      logger.debug({ filename }, 'Already applied — skipping');
      continue;
    }
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const sql = await fs.readFile(filepath, 'utf-8');
    logger.info({ filename }, 'Applying migration');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      logger.info({ filename }, '✔ Applied');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, filename }, '✗ Migration failed');
      throw err;
    } finally {
      client.release();
    }
  }
  logger.info('All migrations applied successfully');
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, 'Migration runner failed');
  process.exit(1);
});
