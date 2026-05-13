-- 0010_payments.sql
-- All payment transactions, online (Razorpay) or offline (cash/cheque/etc).
-- Supports partial refunds via refunded_amount accumulator.

CREATE TABLE payments (
    id                          BIGSERIAL PRIMARY KEY,
    booking_id                  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    payment_source              VARCHAR(20) NOT NULL,
    razorpay_order_id           VARCHAR(100),
    razorpay_payment_id         VARCHAR(100),
    amount                      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency                    VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_method              VARCHAR(50),
    payment_status              VARCHAR(20) NOT NULL DEFAULT 'created',
    payment_type                VARCHAR(20) NOT NULL DEFAULT 'advance',
    collected_by_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    captured_at                 TIMESTAMPTZ,
    failure_reason              VARCHAR(500),
    refunded_amount             NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
    razorpay_refund_id          VARCHAR(100),
    refund_reason               VARCHAR(500),
    refunded_at                 TIMESTAMPTZ,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT payments_source_chk
        CHECK (payment_source IN ('razorpay', 'offline')),
    CONSTRAINT payments_status_chk
        CHECK (payment_status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
    CONSTRAINT payments_type_chk
        CHECK (payment_type IN ('advance', 'balance', 'full')),
    CONSTRAINT payments_method_chk
        CHECK (payment_method IS NULL OR payment_method IN
            ('upi', 'card', 'netbanking', 'wallet', 'emi',
             'cash', 'upi_qr_offline', 'card_swipe', 'cheque')),
    -- razorpay payments must carry order_id; offline must record collector
    CONSTRAINT payments_source_consistency_chk
        CHECK (
            (payment_source = 'razorpay' AND razorpay_order_id IS NOT NULL)
            OR (payment_source = 'offline' AND collected_by_user_id IS NOT NULL)
        ),
    -- refund amount cannot exceed amount
    CONSTRAINT payments_refund_within_amount_chk
        CHECK (refunded_amount <= amount)
);

CREATE UNIQUE INDEX payments_razorpay_order_unique_idx
    ON payments (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX payments_razorpay_payment_unique_idx
    ON payments (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE UNIQUE INDEX payments_razorpay_refund_unique_idx
    ON payments (razorpay_refund_id) WHERE razorpay_refund_id IS NOT NULL;

CREATE INDEX payments_booking_status_idx ON payments (booking_id, payment_status);
CREATE INDEX payments_source_created_idx ON payments (payment_source, created_at);

CREATE TRIGGER payments_set_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
