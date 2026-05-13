-- 0005_services.sql
-- Tests + Health Packages (is_package=TRUE).

CREATE TABLE services (
    id                          BIGSERIAL PRIMARY KEY,
    category_id                 BIGINT NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
    name                        VARCHAR(255) NOT NULL,
    slug                        VARCHAR(255) NOT NULL UNIQUE,
    test_key                    VARCHAR(255) UNIQUE,
    price                       NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    short_description           VARCHAR(500),
    full_details                TEXT,
    prep_instructions           TEXT,
    sample_type                 VARCHAR(100),
    report_turnaround_hours     INT,
    image_url                   VARCHAR(500),
    is_package                  BOOLEAN NOT NULL DEFAULT FALSE,
    package_service_ids         JSONB,
    package_discount_percent    NUMERIC(5, 2) CHECK (package_discount_percent IS NULL OR (package_discount_percent >= 0 AND package_discount_percent <= 100)),
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT services_package_consistency_chk CHECK (
        (is_package = FALSE) OR (package_service_ids IS NOT NULL AND jsonb_typeof(package_service_ids) = 'array')
    )
);

CREATE INDEX services_category_active_idx ON services (category_id, is_active);
CREATE INDEX services_name_trgm_idx ON services USING gin (name gin_trgm_ops);

CREATE TRIGGER services_set_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
