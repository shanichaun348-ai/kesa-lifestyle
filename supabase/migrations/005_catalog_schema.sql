-- Product catalogue tables.
--
-- Separate from the order/inventory schema (001_orders_schema.sql).
-- The `product_variants` table in 001 is the inventory tracking table.
-- These tables are the catalogue: names, prices, images, descriptions.
--
-- Naming convention: `cat_` prefix to avoid collision with the existing
-- inventory `product_variants` table and Drizzle schema tables.

-- ── cat_products ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_products (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  gender          TEXT NOT NULL CHECK (gender IN ('women', 'men', 'unisex')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('draft', 'active', 'archived')),
  primary_category_path TEXT NOT NULL,
  category_paths  TEXT[]  NOT NULL DEFAULT '{}',
  tags            TEXT[]  NOT NULL DEFAULT '{}',
  family_id       TEXT,
  family_option_label TEXT,
  option_name     TEXT CHECK (option_name IS NULL OR option_name IN ('Size', 'Length')),
  attributes      JSONB   NOT NULL DEFAULT '{}',
  short_description TEXT  NOT NULL DEFAULT '',
  description     TEXT[]  NOT NULL DEFAULT '{}',
  highlights      TEXT[]  NOT NULL DEFAULT '{}',
  styling_tips    TEXT[]  NOT NULL DEFAULT '{}',
  care            TEXT    NOT NULL DEFAULT '',
  weight_grams    INT,
  dimensions      TEXT,
  hsn_code        TEXT    NOT NULL DEFAULT '7117',
  gst_rate_bp     INT     NOT NULL DEFAULT 300,
  return_policy   TEXT    NOT NULL DEFAULT 'returnable'
                  CHECK (return_policy IN ('returnable', 'exchange_only', 'final_sale')),
  low_stock_threshold INT NOT NULL DEFAULT 3,
  complete_the_look_slugs TEXT[] NOT NULL DEFAULT '{}',
  faq             JSONB   NOT NULL DEFAULT '[]',
  discontinued_redirect_path TEXT,
  images          JSONB   NOT NULL DEFAULT '[]',
  published_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  sales_30d       INT     NOT NULL DEFAULT 0,
  sort_weight     INT     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gst_rate_range CHECK (gst_rate_bp BETWEEN 0 AND 10000)
);
CREATE INDEX IF NOT EXISTS idx_cat_products_status      ON cat_products (status);
CREATE INDEX IF NOT EXISTS idx_cat_products_primary_cat ON cat_products (primary_category_path);
CREATE INDEX IF NOT EXISTS idx_cat_products_published   ON cat_products (published_at);
CREATE INDEX IF NOT EXISTS idx_cat_products_sort        ON cat_products (sort_weight DESC);
CREATE INDEX IF NOT EXISTS idx_cat_products_family      ON cat_products (family_id) WHERE family_id IS NOT NULL;

-- ── cat_variants ─────────────────────────────────────────────────────────────
-- Catalogue variant: price + SKU. Stock comes from the inventory
-- `product_variants` table (001_orders_schema.sql) via the SKU key.
CREATE TABLE IF NOT EXISTS cat_variants (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id      TEXT NOT NULL REFERENCES cat_products(id) ON DELETE CASCADE,
  sku             TEXT NOT NULL UNIQUE,
  option_value    TEXT,
  price_paise     INT  NOT NULL CHECK (price_paise > 0),
  compare_at_paise INT,
  position        INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT compare_at_gt_price CHECK (
    compare_at_paise IS NULL OR compare_at_paise > price_paise
  )
);
CREATE INDEX IF NOT EXISTS idx_cat_variants_product_id ON cat_variants (product_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE cat_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_variants ENABLE ROW LEVEL SECURITY;

-- Public read: storefront displays active products and their variants.
-- Inactive/draft/archived products are filtered in application code,
-- but we allow the read so the app can perform the filter server-side.
CREATE POLICY "anon_read_cat_products"
  ON cat_products FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_cat_variants"
  ON cat_variants FOR SELECT TO anon USING (true);

-- ── Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cat_products, cat_variants TO service_role;
GRANT SELECT ON TABLE cat_products, cat_variants TO anon;
