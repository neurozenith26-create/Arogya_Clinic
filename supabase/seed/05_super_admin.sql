-- 05_super_admin.sql
-- Seed two demo accounts:
--   admin@gmail.com    / 123  (super_admin)
--   patient@gmail.com  / 123  (patient)
--
-- Both password hashes are bcrypt('123', 10). ROTATE THESE IN PRODUCTION:
-- either reset via admin UI or run a one-off UPDATE with a freshly hashed
-- value.
--
-- Note: users(email) has a PARTIAL unique index (WHERE email IS NOT NULL),
-- so ON CONFLICT must reproduce the same WHERE predicate to use the index.

INSERT INTO users (
    role, email, mobile, first_name, last_name,
    is_active, is_login_enabled,
    admin_role, permissions,
    password_hash
) VALUES (
    'super_admin',
    'admin@gmail.com',
    '+919831990734',
    'Arogya',
    'Admin',
    TRUE,
    TRUE,
    'super_admin',
    '{"bookings":["view","edit","delete"],"reports":["view","upload","delete"],"payments":["view","refund"],"users":["view","create","edit","delete"],"settings":["view","edit"]}'::jsonb,
    -- bcrypt('123', 10)
    '$2a$10$J2Xg4UlxkXmf3IENDe3XU..NG7Rf9y8VFuCVPgJzZhpKMRgFJ3GNK'
)
ON CONFLICT (email) WHERE email IS NOT NULL DO UPDATE SET
    role = EXCLUDED.role,
    admin_role = EXCLUDED.admin_role,
    permissions = EXCLUDED.permissions,
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
