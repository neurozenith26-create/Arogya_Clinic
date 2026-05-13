-- 0018_serviceable_pincodes.sql
-- Pincode whitelist for home-collection serviceability + zone-based pricing.

CREATE TABLE serviceable_pincodes (
    id                          BIGSERIAL PRIMARY KEY,
    pincode                     VARCHAR(10) NOT NULL UNIQUE,
    city                        VARCHAR(100),
    state                       VARCHAR(50),
    zone                        VARCHAR(50),
    home_visit_charge           NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (home_visit_charge >= 0),
    collection_lead_time_hours  INT NOT NULL DEFAULT 4,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX serviceable_pincodes_lookup_idx
    ON serviceable_pincodes (pincode) WHERE is_active = TRUE;

CREATE TRIGGER serviceable_pincodes_set_updated_at
    BEFORE UPDATE ON serviceable_pincodes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
