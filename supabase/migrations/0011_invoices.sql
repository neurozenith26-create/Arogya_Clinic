-- 0011_invoices.sql
-- Uniform invoices across all booking types (online + walk-in).
-- One invoice per booking. Number format: INV-YYYYMM-NNNNNN.

CREATE SEQUENCE seq_invoice_number START 1;

CREATE TABLE invoices (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
    invoice_number      VARCHAR(30) NOT NULL UNIQUE,
    subtotal_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    gstin               VARCHAR(20),
    pdf_url             VARCHAR(500),
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_to_patient_at  TIMESTAMPTZ
);

CREATE INDEX invoices_booking_idx ON invoices (booking_id);

CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS TRIGGER AS $$
DECLARE
    seq_val BIGINT;
    yyyymm  TEXT := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMM');
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        seq_val := nextval('seq_invoice_number');
        NEW.invoice_number := 'INV-' || yyyymm || '-' || LPAD(seq_val::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_generate_number
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
