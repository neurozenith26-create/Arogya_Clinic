-- 0002_users.sql
-- Unified users table (Single Table Inheritance):
-- one row per human (patient | doctor | admin | super_admin), with role-specific
-- columns populated based on role. Enforced by a CHECK constraint.

CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id            UUID UNIQUE,                     -- FK to auth.users; NULL for doctors and DB-seeded actors
    role                    VARCHAR(20) NOT NULL,

    -- Common identity
    email                   CITEXT,
    mobile                  VARCHAR(15),
    first_name              VARCHAR(100),
    last_name               VARCHAR(100),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_login_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at           TIMESTAMPTZ,
    failed_login_count      SMALLINT NOT NULL DEFAULT 0,
    locked_until            TIMESTAMPTZ,

    -- Patient-specific
    date_of_birth           DATE,
    gender                  VARCHAR(10),
    default_address         JSONB,
    emergency_contact       JSONB,
    alternative_number      VARCHAR(15),

    -- Doctor-specific
    profile_photo_url       VARCHAR(500),
    department_id           BIGINT,                          -- FK added in 0003 after departments table exists
    speciality              VARCHAR(200),
    qualifications          TEXT[],
    consultation_fee        NUMERIC(10, 2),
    about                   TEXT,
    education_training      TEXT,
    is_verified             BOOLEAN DEFAULT FALSE,
    offers_home_visit       BOOLEAN DEFAULT FALSE,
    rating_avg              NUMERIC(2, 1) DEFAULT 0,
    rating_count            INT DEFAULT 0,

    -- Admin-specific
    admin_role              VARCHAR(50),
    permissions             JSONB,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_chk
        CHECK (role IN ('patient', 'doctor', 'admin', 'super_admin')),
    CONSTRAINT users_gender_chk
        CHECK (gender IS NULL OR gender IN ('M', 'F', 'O')),
    CONSTRAINT users_admin_role_chk
        CHECK (admin_role IS NULL OR admin_role IN
            ('receptionist', 'lab_tech', 'finance', 'admin', 'super_admin')),
    CONSTRAINT users_consultation_fee_chk
        CHECK (consultation_fee IS NULL OR consultation_fee >= 0),
    CONSTRAINT users_role_consistency_chk
        CHECK (
            (role <> 'doctor' OR (speciality IS NOT NULL AND consultation_fee IS NOT NULL))
            AND (role NOT IN ('admin', 'super_admin') OR admin_role IS NOT NULL)
        )
);

-- Unique email when present
CREATE UNIQUE INDEX users_email_unique_idx ON users (email) WHERE email IS NOT NULL;

-- Unique mobile when present and active
CREATE UNIQUE INDEX users_mobile_unique_idx
    ON users (mobile)
    WHERE mobile IS NOT NULL AND is_active = TRUE;

-- Role-specific indexes (partial — only index rows matching the role)
CREATE INDEX users_patient_active_idx
    ON users (id) WHERE role = 'patient' AND is_active = TRUE;

CREATE INDEX users_doctor_listing_idx
    ON users (department_id, is_verified)
    WHERE role = 'doctor' AND is_active = TRUE;

CREATE INDEX users_admin_idx
    ON users (admin_role) WHERE role IN ('admin', 'super_admin');

CREATE INDEX users_role_active_idx ON users (role, is_active);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
