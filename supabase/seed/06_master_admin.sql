-- 06_master_admin.sql
-- Seed the new master super admin (role='super_admin', branch_id=NULL) and a
-- second demo branch so the super-admin dropdown has more than one option.
--
--   superadmin@gmail.com / 123  → role='super_admin', view-only across branches,
--                              writes only to /admin/branch-admins.
--
-- The super-admin's "view-only everywhere else" rule is enforced by the
-- backend `enforceBranchAdminWrite` middleware; the permissions blob here
-- is informational/auditable only.
--
-- Idempotent: ON CONFLICT clauses match the partial unique indexes on the
-- target tables.

-- ── 1. Second demo branch (Mumbai) — only inserted if not present ───────
INSERT INTO branches (
    branch_code, name, address_line1, city, state, pincode, phone, email
) VALUES (
    'AROGYA-MUM',
    'Arogya Diagnostics — Mumbai',
    'Andheri West',
    'Mumbai',
    'Maharashtra',
    '400053',
    '+912226705000',
    'mumbai@arogya.in'
)
ON CONFLICT (branch_code) DO NOTHING;

-- ── 2. Master super admin user ──────────────────────────────────────────
INSERT INTO users (
    role, email, mobile, first_name, last_name,
    is_active, is_login_enabled,
    admin_role, permissions, branch_id,
    password_hash
) VALUES (
    'super_admin',
    'superadmin@gmail.com',
    '+919999988888',
    'Master',
    'Admin',
    TRUE,
    TRUE,
    'super_admin',
    '{"branch_admins":["view","create","edit","delete"],"_all_other_sections":"view"}'::jsonb,
    NULL,
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
