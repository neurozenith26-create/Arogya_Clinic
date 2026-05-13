-- 0014_enquiries.sql
-- Contact-form submissions from the public website.

CREATE TABLE enquiries (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(15),
    subject         VARCHAR(255),
    message         TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'new',
    responded_at    TIMESTAMPTZ,
    responded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT enquiries_status_chk
        CHECK (status IN ('new', 'read', 'replied', 'closed'))
);

CREATE INDEX enquiries_status_created_idx ON enquiries (status, created_at DESC);
