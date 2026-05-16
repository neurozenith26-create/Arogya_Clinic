-- 0028_branches.sql
-- Multi-branch support. Adds one new `branches` table and `branch_id` columns
-- to the tables that need row-level branch scoping (bookings, doctor_centers,
-- serviceable_pincodes, users).
--
-- IMPORTANT — clinic_settings is intentionally NOT touched: its UNIQUE(key)
-- constraint would conflict with per-branch overrides. Per-branch UPI/GSTIN/
-- phone/hours live directly on the branches table; clinic_settings remains
-- the global default fallback.
--
-- This migration is purely additive (single new nullable column on four tables,
-- single new table, partial unique indexes, one targeted UPDATE). The only row
-- that changes state is the existing admin@gmail.com which flips from
-- super_admin → admin with branch_id=1 (Main Branch). All existing bookings/
-- pincodes/doctor_centers are backfilled to branch_id=1, so the live demo
-- behaves identically post-migration.

-- ── 1. Branches table ────────────────────────────────────────────────────
CREATE TABLE branches (
    id              BIGSERIAL PRIMARY KEY,
    branch_code     VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(150) NOT NULL,
    address_line1   VARCHAR(255) NOT NULL,
    address_line2   VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         VARCHAR(10)  NOT NULL,
    phone           VARCHAR(15)  NOT NULL,
    email           CITEXT,
    gstin           VARCHAR(20),
    upi_id          VARCHAR(100),
    upi_payee_name  VARCHAR(100),
    business_hours  JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER branches_set_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX branches_active_idx ON branches (is_active) WHERE is_active = TRUE;

-- ── 2. Seed the default Main Branch (id=1) for backfill ──────────────────
INSERT INTO branches (
    id, branch_code, name, address_line1, city, state, pincode, phone, email
) VALUES (
    1, 'AROGYA-MAIN', 'Arogya Diagnostics — Main Branch',
    'Kolkata Office', 'Kolkata', 'West Bengal', '700001',
    '+919831990734', 'contact@arogya.in'
);
SELECT setval('branches_id_seq', 1, true);

-- ── 3. Add branch_id columns (nullable initially) ────────────────────────
ALTER TABLE users                ADD COLUMN branch_id BIGINT REFERENCES branches(id);
ALTER TABLE bookings             ADD COLUMN branch_id BIGINT REFERENCES branches(id);
ALTER TABLE doctor_centers       ADD COLUMN branch_id BIGINT REFERENCES branches(id);
ALTER TABLE serviceable_pincodes ADD COLUMN branch_id BIGINT REFERENCES branches(id);

-- ── 4. Backfill existing rows to the Main Branch ─────────────────────────
UPDATE bookings             SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE doctor_centers       SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE serviceable_pincodes SET branch_id = 1 WHERE branch_id IS NULL;
-- users.branch_id stays NULL for super_admin/patient/doctor; only branch
-- admins (role='admin') get a value. Set after the role flip below.

-- ── 5. Tighten: every booking belongs to a branch ────────────────────────
-- DEFAULT 1 BEFORE SET NOT NULL is what makes this migration safe to apply
-- against Phase-1 (deployed) code, whose INSERT INTO bookings statements use
-- explicit column lists that omit branch_id. With DEFAULT 1, Postgres auto-
-- fills Main Branch on inserts that don't supply the column — old code keeps
-- working unchanged. New (Phase-2) code supplies an explicit branch_id and
-- overrides the default.
ALTER TABLE bookings ALTER COLUMN branch_id SET DEFAULT 1;
ALTER TABLE bookings ALTER COLUMN branch_id SET NOT NULL;

-- ── 6. Role flip for the existing demo admin ─────────────────────────────
-- admin@gmail.com is described by the client as "basically one branch admin".
-- Flip his role from super_admin → admin and pin to Main Branch. Idempotent:
-- the WHERE clause excludes the row on re-runs after the flip succeeds.
UPDATE users
   SET role       = 'admin',
       admin_role = 'admin',
       branch_id  = 1
 WHERE email      = 'admin@gmail.com'
   AND role       = 'super_admin';

-- ── 7. Indexes for branch-scoped queries ─────────────────────────────────
CREATE INDEX idx_bookings_branch_status
    ON bookings (branch_id, booking_status, scheduled_date DESC);

CREATE INDEX idx_pincodes_branch
    ON serviceable_pincodes (branch_id);

CREATE INDEX idx_doctor_centers_branch
    ON doctor_centers (branch_id);

-- ── 8. One-branch-one-admin invariant ────────────────────────────────────
-- Partial unique index: at most one active branch admin per branch.
-- Disabled admins (is_active=FALSE) are excluded, so a branch can be
-- re-staffed after deactivating the previous admin.
CREATE UNIQUE INDEX users_one_active_admin_per_branch
    ON users (branch_id)
 WHERE role = 'admin' AND is_active = TRUE AND branch_id IS NOT NULL;
