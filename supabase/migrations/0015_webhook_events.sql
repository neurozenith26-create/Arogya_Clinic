-- 0015_webhook_events.sql
-- Razorpay webhook idempotency + audit log.
-- Each webhook is stored verbatim; UNIQUE(event_id) prevents double-processing on replay.

CREATE TABLE webhook_events (
    id                      BIGSERIAL PRIMARY KEY,
    event_id                VARCHAR(100) NOT NULL UNIQUE,
    event_type              VARCHAR(50) NOT NULL,
    razorpay_order_id       VARCHAR(100),
    razorpay_payment_id     VARCHAR(100),
    payload                 JSONB NOT NULL,
    signature_valid         BOOLEAN,
    processed               BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at            TIMESTAMPTZ,
    processing_error        TEXT,
    received_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX webhook_events_processed_idx ON webhook_events (processed, received_at);
