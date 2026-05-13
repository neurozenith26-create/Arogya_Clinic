-- 0003_departments.sql
-- Clinical departments (Cardiology, Diabetology, ...).

CREATE TABLE departments (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL UNIQUE,
    slug            VARCHAR(150) NOT NULL UNIQUE,
    description     TEXT,
    icon_url        VARCHAR(500),
    banner_url      VARCHAR(500),
    display_order   INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER departments_set_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now wire the FK from users.department_id (defined in 0002 without FK to avoid order issue).
ALTER TABLE users
    ADD CONSTRAINT users_department_fk
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
