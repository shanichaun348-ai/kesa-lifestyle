-- Discount codes managed from the admin. Checkout validates against this
-- table and the existing coupon_redemptions ledger (001), which the order
-- RPC fills on creation. Codes are stored upper-case. Additive; idempotent.

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  -- percent: 1–100; fixed: amount in paise
  value INTEGER NOT NULL,
  min_order_paise BIGINT NOT NULL DEFAULT 0,
  -- cap for percent discounts, in paise; NULL = no cap
  max_discount_paise BIGINT NULL,
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  usage_limit INTEGER NULL,
  per_customer_limit INTEGER NULL,
  first_order_only BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_code_unique') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_code_unique UNIQUE (code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_code_upper') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_code_upper CHECK (code = upper(code) AND code ~ '^[A-Z0-9_-]{2,20}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_type_valid') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_type_valid CHECK (type IN ('percent', 'fixed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_value_valid') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_value_valid CHECK (
      (type = 'percent' AND value BETWEEN 1 AND 100) OR (type = 'fixed' AND value > 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_amounts_non_negative') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_amounts_non_negative CHECK (
      min_order_paise >= 0
      AND (max_discount_paise IS NULL OR max_discount_paise > 0)
      AND (usage_limit IS NULL OR usage_limit > 0)
      AND (per_customer_limit IS NULL OR per_customer_limit > 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_window_valid') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_window_valid CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (active, ends_at);

-- updated_at maintenance (function created in 009_customer_accounts.sql).
DROP TRIGGER IF EXISTS set_updated_at ON coupons;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only server code reads coupons, through the service role (checkout + admin).
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coupons TO service_role;
