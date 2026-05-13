-- 0004_service_categories.sql
-- Top-level service groupings (Pathology, Radiology, Holistic Care, Health Packages).

CREATE TABLE service_categories (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL UNIQUE,
    slug            VARCHAR(150) NOT NULL UNIQUE,
    icon_url        VARCHAR(500),
    banner_url      VARCHAR(500),
    display_order   INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER service_categories_set_updated_at
    BEFORE UPDATE ON service_categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
