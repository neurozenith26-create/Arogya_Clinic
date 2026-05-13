-- 0019_rls_helpers.sql
-- Helper SQL functions used by RLS policies.
-- These run as SECURITY DEFINER so they can read the users table even when RLS
-- restricts the calling user from seeing other rows.

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_app_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT EXISTS(
        SELECT 1 FROM users
        WHERE auth_user_id = auth.uid()
          AND role IN ('admin', 'super_admin')
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT EXISTS(
        SELECT 1 FROM users
        WHERE auth_user_id = auth.uid()
          AND role = 'super_admin'
          AND is_active = TRUE
    );
$$;
