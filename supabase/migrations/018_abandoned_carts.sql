-- Server-side copy of a shopper's bag so a reminder can be sent when it is
-- left behind. Rows exist only while the bag is non-empty and the shopper
-- has not converted; reminders go out only with explicit consent and stop
-- after two. Additive; idempotent.

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Random 32-hex token held in the kesa_cart cookie and used in resume links.
  token TEXT NOT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  profile_id UUID NULL REFERENCES profiles (id) ON DELETE SET NULL,
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  -- [{ sku, productSlug, name, optionLabel?, unitPricePaise, quantity, image }]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_paise BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  reminder_count SMALLINT NOT NULL DEFAULT 0,
  last_reminded_at TIMESTAMPTZ NULL,
  converted_order_id TEXT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_token_unique') THEN
    ALTER TABLE carts ADD CONSTRAINT carts_token_unique UNIQUE (token);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_status_valid') THEN
    ALTER TABLE carts ADD CONSTRAINT carts_status_valid
      CHECK (status IN ('open', 'converted', 'reminded', 'unsubscribed', 'expired'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_reminder_count_range') THEN
    ALTER TABLE carts ADD CONSTRAINT carts_reminder_count_range CHECK (reminder_count BETWEEN 0 AND 2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_carts_status_activity ON carts (status, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_carts_email ON carts (email);

-- updated_at maintenance (function created in 009_customer_accounts.sql).
DROP TRIGGER IF EXISTS set_updated_at ON carts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only server code touches carts, through the service role.
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE carts TO service_role;
