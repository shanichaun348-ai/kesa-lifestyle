-- Product videos (self-hosted clips or YouTube) managed from the admin and
-- shown after the photos in the product gallery. Additive; idempotent.
ALTER TABLE cat_products ADD COLUMN IF NOT EXISTS videos JSONB NOT NULL DEFAULT '[]'::jsonb;
