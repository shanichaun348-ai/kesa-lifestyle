-- Owner-editable storefront content that is too small for its own table:
-- one JSON document per key (e.g. "home.look" = the pieces listed beside the
-- "Shop the look" photo on the homepage). Read and written only by server
-- code through the service role; validated with zod before use.
-- Idempotent; additive only.

CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
-- No anon policy on purpose: the browser never reads this table directly.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE site_content TO service_role;
