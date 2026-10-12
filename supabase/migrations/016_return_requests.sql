-- Return and exchange requests raised by customers against delivered orders.
-- One open request (requested/approved/received) per order is enforced in
-- application code. Additive; idempotent.

CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  profile_id UUID NULL REFERENCES profiles (id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  -- [{ sku, productName, quantity, reason }]
  items JSONB NOT NULL,
  details TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'requested',
  -- Shown to the customer (pickup instructions, rejection reason).
  admin_note TEXT,
  -- Staff only.
  internal_note TEXT,
  refund_paise BIGINT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_kind_valid') THEN
    ALTER TABLE return_requests ADD CONSTRAINT return_requests_kind_valid CHECK (kind IN ('return', 'exchange'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_status_valid') THEN
    ALTER TABLE return_requests ADD CONSTRAINT return_requests_status_valid
      CHECK (status IN ('requested', 'approved', 'rejected', 'received', 'refunded', 'exchanged', 'cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_refund_non_negative') THEN
    ALTER TABLE return_requests ADD CONSTRAINT return_requests_refund_non_negative CHECK (refund_paise IS NULL OR refund_paise >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status_created ON return_requests (status, created_at DESC);

-- updated_at maintenance (function created in 009_customer_accounts.sql).
DROP TRIGGER IF EXISTS set_updated_at ON return_requests;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON return_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only server code touches return requests, through the service role.
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE return_requests TO service_role;
