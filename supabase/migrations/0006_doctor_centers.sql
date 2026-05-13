-- 0006_doctor_centers.sql
-- A doctor can consult at one or more centers. Each center has its own weekly
-- schedule (JSONB) for in-clinic and home-visit slots.

CREATE TABLE doctor_centers (
    id                              BIGSERIAL PRIMARY KEY,
    doctor_user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    center_name                     VARCHAR(150) NOT NULL,
    address                         VARCHAR(500) NOT NULL,
    phone                           VARCHAR(15),
    map_link                        VARCHAR(500),
    city                            VARCHAR(100),
    pincode                         VARCHAR(10),
    consultation_fee_override       NUMERIC(10, 2) CHECK (consultation_fee_override IS NULL OR consultation_fee_override >= 0),
    schedule                        JSONB,
    home_visit_schedule             JSONB,
    is_active                       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX doctor_centers_doctor_active_idx ON doctor_centers (doctor_user_id, is_active);

CREATE TRIGGER doctor_centers_set_updated_at
    BEFORE UPDATE ON doctor_centers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN doctor_centers.schedule IS
    'JSONB shape: { mon: {start, end, slot_minutes, buffer_minutes, lunch_start, lunch_end, max_bookings}, ... }';
COMMENT ON COLUMN doctor_centers.home_visit_schedule IS
    'Same shape as schedule. NULL means doctor does not offer home visits from this center.';
