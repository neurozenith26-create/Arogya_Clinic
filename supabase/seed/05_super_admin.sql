-- 05_super_admin.sql
-- Seed the two original demo accounts. Idempotent on re-seed.
--   admin@gmail.com    / 123  → role='admin', admin_role='admin', branch_id=1 (Main Branch)
--   patient@gmail.com  / 123  → role='patient'
--
-- After 0028_branches.sql, admin@gmail.com is a *branch admin* of Main Branch
-- (per client clarification "current admin is basically one branch admin").
-- The migration includes a one-shot UPDATE that flips an existing super_admin
-- row to the new role; this seed file matches that end state so a fresh
-- seed also produces a branch admin.
--
-- The new master super admin (superadmin@gmail.com) is seeded separately in
-- 06_master_admin.sql.
--
-- Both password hashes are bcrypt('123', 10). ROTATE THESE IN PRODUCTION.
--
-- Note: users(email) has a PARTIAL unique index (WHERE email IS NOT NULL),
-- so ON CONFLICT must reproduce the same WHERE predicate to use the index.

INSERT INTO users (
    role, email, mobile, first_name, last_name,
    is_active, is_login_enabled,
    admin_role, permissions, branch_id,
    password_hash
) VALUES (
    'admin',
    'admin@gmail.com',
    '+919831990734',
    'Arogya',
    'Admin',
    TRUE,
    TRUE,
    'admin',
    '{"bookings":["view","edit","delete"],"reports":["view","upload","delete"],"payments":["view","refund"],"users":["view","create","edit","delete"],"settings":["view","edit"]}'::jsonb,
    1,
    -- bcrypt('123', 10)
    '$2a$10$J2Xg4UlxkXmf3IENDe3XU..NG7Rf9y8VFuCVPgJzZhpKMRgFJ3GNK'
)
ON CONFLICT (email) WHERE email IS NOT NULL DO UPDATE SET
    role = EXCLUDED.role,
    admin_role = EXCLUDED.admin_role,
    permissions = EXCLUDED.permissions,
    branch_id = EXCLUDED.branch_id,
    password_hash = EXCLUDED.password_hash,
    is_active = TRUE,
    is_login_enabled = TRUE;

INSERT INTO users (
    role, email, mobile, first_name, last_name,
    is_active, is_login_enabled,
    password_hash
) VALUES (
    'patient',
    'patient@gmail.com',
    '9999900000',
    'Demo',
    'Patient',
    TRUE,
    TRUE,
    -- bcrypt('123', 10)
    '$2a$10$J2Xg4UlxkXmf3IENDe3XU..NG7Rf9y8VFuCVPgJzZhpKMRgFJ3GNK'
)
ON CONFLICT (email) WHERE email IS NOT NULL DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = TRUE,
    is_login_enabled = TRUE;
