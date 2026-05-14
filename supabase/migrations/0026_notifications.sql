-- 0026_notifications.sql
-- Lightweight notification feed for the bell icon in both admin + patient
-- headers. One row per event. Reads are scoped by user_id (NULL = broadcast
-- to all admins, e.g. "patient submitted UPI proof"); writes happen from the
-- backend when domain events fire.
--
-- We deliberately avoid foreign-key cascade pain — if the related booking
-- or payment is later deleted, the notification stays as an audit trail.

CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    -- NULL means broadcast to all admin/super_admin users; otherwise the
    -- specific user the notification is addressed to.
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    -- 'admin' broadcast / 'patient' / 'collector' — used together with user_id
    -- to filter the recipient set without an extra audience-table.
    audience        VARCHAR(20) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    body            VARCHAR(500),
    -- Deep-link the bell-icon dropdown should send the user to when they
    -- click this row (e.g. '/admin/payment-verifications', '/dashboard/bookings/3').
    link            VARCHAR(255),
    -- Free-form tag, e.g. 'proof_submitted', 'reverified', 'collector_assigned',
    -- 'collection_status_changed'. Lets the frontend pick an icon/colour.
    event           VARCHAR(50) NOT NULL,
    -- Cached references — duplicated so the bell dropdown doesn't need joins.
    booking_id      BIGINT,
    booking_code    VARCHAR(30),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_audience_chk
        CHECK (audience IN ('admin', 'patient', 'collector'))
);

-- Per-recipient unread lookup is the hot path.
CREATE INDEX notifications_user_unread_idx
    ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;
-- Admin broadcasts (user_id IS NULL, audience='admin') — bell shows these to
-- every admin until they mark-as-read (mark-read is per-user, so we need
-- a separate read tracker for broadcasts — see notification_reads below).
CREATE INDEX notifications_admin_broadcasts_idx
    ON notifications (created_at DESC)
    WHERE user_id IS NULL AND audience = 'admin';

-- Per-user read state for broadcast notifications. A row here means that
-- specific user has dismissed the broadcast from their bell. The bell query
-- LEFT JOINs to detect "unread by me".
CREATE TABLE notification_reads (
    notification_id     BIGINT      NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (notification_id, user_id)
);
