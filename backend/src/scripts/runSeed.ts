import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/pool.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, '../../../supabase/seed');

async function run() {
  logger.info({ dir: SEED_DIR }, 'Running seed files');
  const files = (await fs.readdir(SEED_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const sql = await fs.readFile(path.join(SEED_DIR, filename), 'utf-8');
    logger.info({ filename }, 'Applying seed');
    await pool.query(sql);
    logger.info({ filename }, '✔ Seeded');
  }
  logger.info('All seeds applied successfully');
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, 'Seed runner failed');
  process.exit(1);
});
