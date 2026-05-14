import { pool } from '../db/pool.js';

async function main() {
  const checks: Array<{ name: string; sql: string }> = [
    { name: 'service_categories total', sql: 'SELECT COUNT(*) AS n FROM service_categories' },
    { name: 'service_categories active', sql: 'SELECT COUNT(*) AS n FROM service_categories WHERE is_active = TRUE' },
    { name: 'services total', sql: 'SELECT COUNT(*) AS n FROM services' },
    { name: 'services active', sql: 'SELECT COUNT(*) AS n FROM services WHERE is_active = TRUE' },
    { name: 'departments total', sql: 'SELECT COUNT(*) AS n FROM departments' },
    { name: 'departments active', sql: 'SELECT COUNT(*) AS n FROM departments WHERE is_active = TRUE' },
    { name: 'users total', sql: 'SELECT COUNT(*) AS n FROM users' },
    { name: 'doctors', sql: `SELECT COUNT(*) AS n FROM users WHERE role = 'doctor'` },
    { name: 'doctors active+verified', sql: `SELECT COUNT(*) AS n FROM users WHERE role = 'doctor' AND is_active = TRUE AND is_verified = TRUE` },
    { name: 'admins', sql: `SELECT COUNT(*) AS n FROM users WHERE role IN ('admin','super_admin')` },
    { name: 'patients', sql: `SELECT COUNT(*) AS n FROM users WHERE role = 'patient'` },
    { name: 'bookings', sql: 'SELECT COUNT(*) AS n FROM bookings' },
  ];
  for (const c of checks) {
    const r = await pool.query<{ n: string }>(c.sql);
    console.log(`${c.name.padEnd(35)} ${r.rows[0].n}`);
  }
  // Sample a few rows from key tables to see the flags
  const dr = await pool.query(
    `SELECT id, first_name, last_name, role, is_active, is_verified, department_id
       FROM users WHERE role = 'doctor' LIMIT 5`,
  );
  console.log('\nSample doctors:');
  console.table(dr.rows);
  const sr = await pool.query(
    `SELECT id, name, slug, is_active FROM services LIMIT 5`,
  );
  console.log('\nSample services:');
  console.table(sr.rows);
  const cr = await pool.query(
    `SELECT id, name, slug, is_active, display_order FROM service_categories LIMIT 10`,
  );
  console.log('\nSample service_categories:');
  console.table(cr.rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
