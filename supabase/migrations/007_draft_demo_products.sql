-- Set the 4 demo products (placeholder images) to draft so they are not
-- visible to customers until real product photography is added.
--
-- These products were seeded with /placeholders/*.svg images and are not
-- production-quality listings. They must be draft until photos are ready.
--
-- To publish a product once photos are added:
--   UPDATE cat_products SET status = 'active', published_at = NOW()
--   WHERE slug = '<slug>';

UPDATE cat_products
SET status = 'draft', published_at = NULL
WHERE slug IN (
  'pearl-drop-earrings-gold-tone',
  'fine-pendant-chain-gold-tone',
  'stackable-band-ring-set',
  'fine-box-chain-stainless-steel'
);
