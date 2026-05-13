-- 0007_doctor_unavailability.sql
-- Holidays / leaves / single-slot blocks for a doctor.

CREATE TABLE doctor_unavailability (
    id                  BIGSERIAL PRIMARY KEY,
    doctor_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_center_id    BIGINT REFERENCES doctor_centers(id) ON DELETE CASCADE,
    unavailable_date    DATE NOT NULL,
    slot_start_time     TIME,
    slot_end_time       TIME,
    reason              VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT doctor_unavailability_slot_range_chk
        CHECK (slot_start_time IS NULL OR slot_end_time IS NULL OR slot_end_time > slot_start_time)
);

CREATE INDEX doctor_unavailability_lookup_idx
    ON doctor_unavailability (doctor_user_id, unavailable_date);

COMMENT ON COLUMN doctor_unavailability.slot_start_time IS 'NULL = whole-day unavailable';
COMMENT ON COLUMN doctor_unavailability.doctor_center_id IS 'NULL = blocked across all centers';
