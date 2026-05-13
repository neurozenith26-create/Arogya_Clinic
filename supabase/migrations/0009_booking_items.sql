-- 0009_booking_items.sql
-- Line items inside a booking. Catalog items reference services(id); walk-in
-- custom items have service_id=NULL and admin-typed item_name + unit_price.

CREATE TABLE booking_items (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    item_type           VARCHAR(20) NOT NULL,
    service_id          BIGINT REFERENCES services(id) ON DELETE RESTRICT,
    doctor_user_id      UUID REFERENCES users(id) ON DELETE RESTRICT,
    item_name           VARCHAR(255) NOT NULL,
    item_description    VARCHAR(500),
    quantity            INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price          NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_price         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT booking_items_type_chk
        CHECK (item_type IN ('doctor_consultation', 'test', 'package', 'custom')),

    CONSTRAINT booking_items_catalog_or_custom_chk
        CHECK (service_id IS NOT NULL OR item_type = 'custom'),

    CONSTRAINT booking_items_consultation_doctor_chk
        CHECK (item_type <> 'doctor_consultation' OR doctor_user_id IS NOT NULL)
);

CREATE INDEX booking_items_booking_idx ON booking_items (booking_id);
