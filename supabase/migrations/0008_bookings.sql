-- 0008_bookings.sql
-- THE HUB. Unified bookings for:
--   - online doctor appointments
--   - online test bookings (cart-based)
--   - walk-in custom bills (admin-created)
-- Discriminated by booking_type, booking_origin, visit_type.

-- Sequences for per-type booking code generation
CREATE SEQUENCE seq_booking_code_doc START 1;
CREATE SEQUENCE seq_booking_code_test START 1;

CREATE TABLE bookings (
    id                          BIGSERIAL PRIMARY KEY,
    booking_code                VARCHAR(30) UNIQUE NOT NULL,

    patient_user_id             UUID REFERENCES users(id) ON DELETE RESTRICT,
    booking_type                VARCHAR(20) NOT NULL,
    booking_origin              VARCHAR(20) NOT NULL DEFAULT 'online',
    visit_type                  VARCHAR(20) NOT NULL,
    doctor_user_id              UUID REFERENCES users(id) ON DELETE RESTRICT,
    doctor_center_id            BIGINT REFERENCES doctor_centers(id) ON DELETE RESTRICT,

    delivery_address            JSONB,
    patient_snapshot            JSONB,

    scheduled_date              DATE,
    scheduled_start_time        TIME,
    scheduled_end_time          TIME,
    slot_locked_until           TIMESTAMPTZ,

    subtotal_amount             NUMERIC(10, 2) NOT NULL DEFAULT 0,
    home_visit_charge           NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount                  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount             NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount                NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    advance_amount              NUMERIC(10, 2) NOT NULL DEFAULT 0,
    balance_amount              NUMERIC(10, 2) NOT NULL DEFAULT 0,

    booking_status              VARCHAR(20) NOT NULL DEFAULT 'draft',
    payment_status              VARCHAR(20) NOT NULL DEFAULT 'pending',

    reason_for_visit            TEXT,
    special_instructions        TEXT,
    admin_notes                 TEXT,

    -- Home collection workflow
    assigned_staff_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    collection_status           VARCHAR(20) NOT NULL DEFAULT 'not_required',

    created_by_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at                TIMESTAMPTZ,
    cancellation_reason         VARCHAR(500),
    completed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bookings_type_chk
        CHECK (booking_type IN ('doctor_appointment', 'test_booking')),
    CONSTRAINT bookings_origin_chk
        CHECK (booking_origin IN ('online', 'walk_in')),
    CONSTRAINT bookings_visit_type_chk
        CHECK (visit_type IN ('in_clinic', 'home_visit')),
    CONSTRAINT bookings_status_chk
        CHECK (booking_status IN
            ('draft', 'pending_payment', 'confirmed', 'in_progress',
             'completed', 'cancelled', 'no_show')),
    CONSTRAINT bookings_payment_status_chk
        CHECK (payment_status IN
            ('pending', 'partial', 'paid', 'refunded', 'failed')),
    CONSTRAINT bookings_collection_status_chk
        CHECK (collection_status IN
            ('not_required', 'not_assigned', 'assigned', 'en_route',
             'collected', 'received_at_lab')),

    -- Online bookings must have a registered patient
    CONSTRAINT bookings_online_patient_chk
        CHECK (booking_origin <> 'online' OR patient_user_id IS NOT NULL),
    -- Walk-ins must capture patient_snapshot when patient is unregistered
    CONSTRAINT bookings_walkin_snapshot_chk
        CHECK (booking_origin <> 'walk_in' OR patient_user_id IS NOT NULL
               OR (patient_snapshot IS NOT NULL AND patient_snapshot ? 'mobile')),
    -- Doctor appointments require a doctor
    CONSTRAINT bookings_doctor_required_chk
        CHECK (booking_type <> 'doctor_appointment' OR doctor_user_id IS NOT NULL),
    -- Walk-ins are never slot-locked
    CONSTRAINT bookings_walkin_no_lock_chk
        CHECK (booking_origin <> 'walk_in' OR slot_locked_until IS NULL)
);

-- Critical: prevent double-booking the same slot.
-- Note: NOW() can't appear in a partial-index predicate (must be IMMUTABLE),
-- so we include 'draft' as a blocking status and rely on the slot-lock expiry
-- cron (every 60s) to mark expired drafts as 'cancelled', freeing the slot.
CREATE UNIQUE INDEX uq_active_slot
    ON bookings (doctor_user_id, doctor_center_id, scheduled_date, scheduled_start_time)
    WHERE doctor_user_id IS NOT NULL
      AND scheduled_date IS NOT NULL
      AND scheduled_start_time IS NOT NULL
      AND booking_status IN ('draft', 'pending_payment', 'confirmed');

-- Operational indexes
CREATE INDEX bookings_patient_date_idx ON bookings (patient_user_id, scheduled_date DESC);
CREATE INDEX bookings_doctor_slot_idx ON bookings (doctor_user_id, scheduled_date, scheduled_start_time);
CREATE INDEX bookings_status_date_idx ON bookings (scheduled_date, booking_status);
CREATE INDEX bookings_slot_lock_expiry_idx ON bookings (slot_locked_until) WHERE slot_locked_until IS NOT NULL;
CREATE INDEX bookings_payment_reconcile_idx ON bookings (payment_status, created_at);
CREATE INDEX bookings_origin_type_idx ON bookings (booking_origin, booking_type, scheduled_date);

CREATE TRIGGER bookings_set_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger to auto-generate booking_code based on booking_type
CREATE OR REPLACE FUNCTION generate_booking_code() RETURNS TRIGGER AS $$
DECLARE
    seq_val BIGINT;
    yyyymm  TEXT := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMM');
BEGIN
    IF NEW.booking_code IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.booking_type = 'doctor_appointment' THEN
        seq_val := nextval('seq_booking_code_doc');
        NEW.booking_code := 'AROGYA-DOC-' || yyyymm || '-' || LPAD(seq_val::TEXT, 6, '0');
    ELSIF NEW.booking_type = 'test_booking' THEN
        seq_val := nextval('seq_booking_code_test');
        NEW.booking_code := 'AROGYA-TEST-' || yyyymm || '-' || LPAD(seq_val::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_generate_code
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION generate_booking_code();
