-- 0021_custom_auth.sql
-- Cuts the cord with Supabase Auth: we now own authentication.
--
-- Supabase becomes a plain Postgres database. The backend issues its own JWTs,
-- hashes passwords with bcrypt, and enforces authorization in middleware on
-- every query — so RLS policies that depended on Supabase's `auth.uid()` are
-- no longer load-bearing and would in fact stop working on a non-Supabase
-- Postgres (Neon, Render, RDS, self-hosted, ...).
--
-- This migration is reversible only by restoring from backup before applying.

-- ── 1. Add password column for our auth ──────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- (auth_user_id stays as a nullable column for future OAuth providers but is
-- no longer referenced by middleware or RLS.)

-- ── 2. Drop policies that referenced auth.uid() ──────────────────────────
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename
        );
    END LOOP;
END $$;

-- ── 3. Disable RLS on every public table ─────────────────────────────────
-- Backend middleware authorizes every query. RLS was Supabase-specific and
-- depended on auth.uid() which doesn't exist outside Supabase.
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- ── 4. Drop helper functions that referenced auth.uid() ──────────────────
DROP FUNCTION IF EXISTS current_app_user_id();
DROP FUNCTION IF EXISTS current_app_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_super_admin();

-- ── 5. Tighten password rules ────────────────────────────────────────────
-- Either password_hash or auth_user_id must be present for any login-enabled
-- user (so we don't accidentally create accounts that can never sign in).
ALTER TABLE users
    ADD CONSTRAINT users_login_capability_chk
    CHECK (
        is_login_enabled = FALSE
        OR password_hash IS NOT NULL
        OR auth_user_id IS NOT NULL
    );

-- ── 6. Index password_hash lookups (rare but defends against scan) ──────
CREATE INDEX IF NOT EXISTS users_email_login_idx
    ON users (email) WHERE email IS NOT NULL AND password_hash IS NOT NULL;
