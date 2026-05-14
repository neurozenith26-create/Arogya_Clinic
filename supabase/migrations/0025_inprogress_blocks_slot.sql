-- 0025_inprogress_blocks_slot.sql
--
-- Two-stage manual-UPI flow changes the default booking_status for fresh
-- patient bookings from 'confirmed' to 'in_progress' — the booking only
-- flips to 'confirmed' once admin re-verifies the UPI payment in person
-- (see migration 0024 + phase2Routes.ts).
--
-- The existing uq_active_slot partial index from 0008 blocked double-booking
-- only while booking_status IN ('draft', 'pending_payment', 'confirmed'),
-- which missed two cases:
--   1. 'in_progress' — the new initial state for upi_manual bookings; if
--      two patients submit proof for the same doctor slot back-to-back,
--      both INSERTs would have succeeded without this fix.
--   2. The natural lifecycle move confirmed→in_progress (admin marks
--      patient as arrived) used to release the slot, letting another
--      patient grab the same time — clearly a bug, even pre-0024.
--
-- This migration recreates uq_active_slot with 'in_progress' added.
-- Partial-unique-index predicates can't reference NOW(), so the
-- slot-lock-expiry cron still needs to flip stale drafts to 'cancelled'
-- to free the slot (unchanged behaviour from 0008).

DROP INDEX IF EXISTS uq_active_slot;

CREATE UNIQUE INDEX uq_active_slot
    ON bookings (doctor_user_id, doctor_center_id, scheduled_date, scheduled_start_time)
    WHERE doctor_user_id IS NOT NULL
      AND booking_status IN ('draft', 'pending_payment', 'confirmed', 'in_progress');
