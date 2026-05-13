-- 0013_reviews.sql
-- Patient reviews / feedback with moderation queue.

CREATE TABLE reviews (
    id                  BIGSERIAL PRIMARY KEY,
    patient_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    doctor_user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    clinic_reply        TEXT,
    replied_at          TIMESTAMPTZ,
    replied_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason    VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reviews_status_chk
        CHECK (status IN ('pending', 'approved', 'rejected', 'hidden'))
);

CREATE INDEX reviews_doctor_status_idx ON reviews (doctor_user_id, status);
CREATE INDEX reviews_status_created_idx ON reviews (status, created_at DESC);

CREATE TRIGGER reviews_set_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
