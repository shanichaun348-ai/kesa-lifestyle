-- Clear the product catalogue before loading real products (2026-10-09).
--
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It removes every product, its variants and its stock rows. Orders, order
-- items, customers, coupons and admin users are untouched: order_items keeps
-- the SKU and product name as plain text, so order history still reads.
--
-- Review the counts printed by the first statement before running the rest.

SELECT
  (SELECT count(*) FROM cat_products)     AS products,
  (SELECT count(*) FROM cat_variants)     AS variants,
  (SELECT count(*) FROM product_variants) AS stock_rows;

BEGIN;

-- cat_variants has ON DELETE CASCADE from cat_products.
DELETE FROM cat_products;

-- Inventory rows are keyed by SKU with no foreign key, so clear them explicitly.
DELETE FROM product_variants;

COMMIT;

-- Optional: also delete the photos uploaded from the admin (bucket product-images).
-- They are harmless orphans if left; uncomment to remove them.
-- DELETE FROM storage.objects WHERE bucket_id = 'product-images';

SELECT
  (SELECT count(*) FROM cat_products)     AS products_after,
  (SELECT count(*) FROM cat_variants)     AS variants_after,
  (SELECT count(*) FROM product_variants) AS stock_rows_after;
