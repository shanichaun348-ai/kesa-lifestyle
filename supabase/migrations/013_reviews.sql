-- Customer product reviews with photos. Reviews are matched to products by
-- slug (the public identity) and to customers by lower-cased email; a review
-- from an email that paid for the product is marked verified and published
-- immediately, everything else waits for moderation. Additive; idempotent.

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug TEXT NOT NULL,
  order_id TEXT NULL REFERENCES orders (id) ON DELETE SET NULL,
  profile_id UUID NULL REFERENCES profiles (id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  rating SMALLINT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moderated_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_range') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_status_valid') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_status_valid CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_one_per_customer_product') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_one_per_customer_product UNIQUE (product_slug, customer_email);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews (product_slug, status);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews (status, created_at DESC);

-- updated_at maintenance (function created in 009_customer_accounts.sql).
DROP TRIGGER IF EXISTS set_updated_at ON reviews;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only server code touches reviews, through the service role.
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reviews TO service_role;
