-- 0024_payment_proof.sql
--
-- Manual UPI-QR + Screenshot/PDF proof flow with two-stage confirmation:
--   1. Patient uploads proof → booking auto-confirms (booking_status='confirmed',
--      payment_status='partial', payments.payment_status='captured').
--   2. Admin re-verifies at sample-collection time → payments.verified_at = NOW().
-- See plan: C:\Users\pradh\.claude\plans\when-clicking-on-pay-noble-dawn.md
--
-- Storage: payment proof is stored as BYTEA inside the payments row (small
-- images / one-page PDFs typical). Same pattern as users.profile_photo_bytes.

-- 1. Proof + re-verification columns on payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_proof_bytes  BYTEA;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_proof_mime   VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS upi_reference        VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at          TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_notes   VARCHAR(500);

-- 2. Sanity: proof bytes + mime go together (both NULL or both set)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_proof_consistency_chk;
ALTER TABLE payments
    ADD CONSTRAINT payments_proof_consistency_chk
    CHECK (
        (payment_proof_bytes IS NULL AND payment_proof_mime IS NULL)
     OR (payment_proof_bytes IS NOT NULL AND payment_proof_mime IS NOT NULL)
    );

-- 3. Extend payment_source enum to include 'upi_manual' (patient-uploaded UPI proof)
ALTER TABLE payments DROP CONSTRAINT payments_source_chk;
ALTER TABLE payments
    ADD CONSTRAINT payments_source_chk
    CHECK (payment_source IN ('razorpay', 'offline', 'upi_manual'));

-- 4. Relax source-consistency check so upi_manual requires proof bytes
--    (instead of collected_by_user_id, which only applies to admin-collected offline).
ALTER TABLE payments DROP CONSTRAINT payments_source_consistency_chk;
ALTER TABLE payments
    ADD CONSTRAINT payments_source_consistency_chk
    CHECK (
        (payment_source = 'razorpay'   AND razorpay_order_id    IS NOT NULL)
     OR (payment_source = 'offline'    AND collected_by_user_id IS NOT NULL)
     OR (payment_source = 'upi_manual' AND payment_proof_bytes  IS NOT NULL)
    );

-- 5. payments_status_chk stays as-is. We reuse the existing 'captured' value
--    for upi_manual rows — the patient's proof is "captured" the moment they
--    upload it; the in-person check at collection time is tracked separately
--    via the verified_at timestamp above, not as a separate status value.

-- 6. Seed clinic UPI settings. ON CONFLICT DO NOTHING so re-applying or
--    later seed runs don't clobber edits made via admin UI.
INSERT INTO clinic_settings (key, value, description) VALUES
    ('upi_id',           '"7584045922@jio"',     'Clinic UPI VPA used to build the dynamic payment QR shown to patients'),
    ('upi_display_name', '"Arogya Diagnostics"', 'Name shown to the payer in their UPI app')
ON CONFLICT (key) DO NOTHING;

-- 7. Index to make the admin re-verify queue cheap.
CREATE INDEX IF NOT EXISTS payments_pending_reverify_idx
    ON payments (created_at DESC)
    WHERE payment_source = 'upi_manual' AND verified_at IS NULL;
