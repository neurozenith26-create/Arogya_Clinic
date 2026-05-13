-- 0022_doctor_photo_blob.sql
-- Store doctor profile photos as BYTEA inside the users row instead of as
-- files behind a URL. Keeps the photo atomically linked to the doctor record
-- and avoids needing a separate file-storage backend for this small image.
--
-- The existing profile_photo_url column is kept but its meaning shifts:
--   - NULL  → no photo
--   - non-NULL ('/doctors/<id>/photo') → photo bytes are stored in this row
-- So the frontend can still gate rendering on `profile_photo_url` being set.

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_bytes BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_mime  VARCHAR(50);

-- Sanity constraint: bytes and mime go together, both NULL or both set.
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_profile_photo_bytes_chk;
ALTER TABLE users
    ADD CONSTRAINT users_profile_photo_bytes_chk
    CHECK (
        (profile_photo_bytes IS NULL AND profile_photo_mime IS NULL)
        OR (profile_photo_bytes IS NOT NULL AND profile_photo_mime IS NOT NULL)
    );
