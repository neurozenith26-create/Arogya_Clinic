-- 0027_report_file_blob.sql
--
-- Move medical report storage from filesystem (storage adapter) into Postgres
-- as BYTEA. Same pattern already used for users.profile_photo_bytes (0022)
-- and payments.payment_proof_bytes (0024). Rationale:
--   - Render's filesystem is ephemeral → reports vanish on every redeploy.
--   - Free Supabase Storage requires extra config; bytea keeps everything
--     inside a single managed DB with backups + point-in-time recovery.
--   - Reports are small (PDFs / images, capped at 25 MB in upload route).
--
-- storage_key is the public, unguessable handle exposed in file_url. The
-- public GET /api/v1/files/:storageKey route looks the row up by this column
-- (not by surrogate id) so URLs don't leak the integer report id.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_bytes  BYTEA;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255);

-- Sanity: when migrating from local-disk storage, legacy rows keep both NULL
-- and continue to serve via their original file_url. New rows always have
-- both populated together.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_storage_consistency_chk;
ALTER TABLE reports
    ADD CONSTRAINT reports_storage_consistency_chk
    CHECK (
        (file_bytes IS NULL AND storage_key IS NULL)
     OR (file_bytes IS NOT NULL AND storage_key IS NOT NULL)
    );

-- Unique index lets the public-serving route do a single point lookup.
CREATE UNIQUE INDEX IF NOT EXISTS reports_storage_key_uidx
    ON reports (storage_key)
    WHERE storage_key IS NOT NULL;
