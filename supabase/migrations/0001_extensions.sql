-- 0001_extensions.sql
-- Required Postgres extensions.

CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- uuid utilities (legacy compat)
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- trigram fuzzy search (service names)
CREATE EXTENSION IF NOT EXISTS citext;         -- case-insensitive email
