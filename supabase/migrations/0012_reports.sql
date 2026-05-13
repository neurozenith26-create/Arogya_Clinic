-- 0012_reports.sql
-- Uploaded medical reports (PDF / image) per booking. Supports versioning
-- via replace flow: bumps version, soft-disables prior row.

CREATE TABLE reports (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    patient_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_name           VARCHAR(255) NOT NULL,
    file_url            VARCHAR(500) NOT NULL,
    file_size_bytes     BIGINT,
    file_mime           VARCHAR(100),
    report_type         VARCHAR(50) NOT NULL DEFAULT 'lab_report',
    version             INT NOT NULL DEFAULT 1,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reports_type_chk
        CHECK (report_type IN ('lab_report', 'prescription', 'scan', 'other')),
    CONSTRAINT reports_file_size_chk
        CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

CREATE INDEX reports_patient_uploaded_idx ON reports (patient_user_id, uploaded_at DESC);
CREATE INDEX reports_booking_active_idx ON reports (booking_id) WHERE is_active = TRUE;
