-- Catalogue seed — 10 Kesa products.
--
-- 6 products with real product photography (seeded in the previous session).
-- 4 representative demo products covering multi-variant, earrings, men's chains, rings.
--
-- SKUs follow the pattern established in src/lib/demo/seed-catalog.ts:
--   KL-{CAT3}-{INDEX4}  (single variant)
--   KL-{CAT3}-{INDEX4}-{OPTION_SLUG}  (multi-variant)
--
-- Prices are in paise (1 INR = 100 paise). GST 3% (gst_rate_bp = 300).
-- All products use HSN code 7117 (imitation jewellery).
--
-- This migration is idempotent: ON CONFLICT DO NOTHING on all inserts.

-- ── Helper: insert products and capture their generated ids ──────────────────
-- We use a single INSERT with RETURNING to get the id for the variant inserts.

DO $$
DECLARE
  v_id TEXT;
BEGIN

  -- ──────────────────────────────────────────────────────────────────────────
  -- 1. Pearl Drop Earrings in Gold Tone  (KL-EAR-0001)
  --    women/earrings | single variant | placeholder images
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'pearl-drop-earrings-gold-tone',
    'Pearl Drop Earrings in Gold Tone',
    'women', 'active', 'women/earrings', ARRAY['women/earrings'],
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold","white"],"occasion":["party-wear","wedding","gifting"],"style":["pearl","contemporary"]}',
    'Pearl Drop Earrings in Gold Tone in gold tone brass, made for party-wear, wedding, gifting.',
    ARRAY[
      'The pearl drop earrings in gold tone is plated in gold tone over a brass base and finished by hand.',
      'It pairs with pearl and contemporary looks and is light enough for all-day wear.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','Nickel-safe, skin-friendly base','Weighs about 6 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Drops lengthen a round face; studs and small hoops balance a longer one.','With hair up, go one size bolder than you think.','Match the metal tone to your watch or rings, not to your outfit.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    6, '7117', 300, 'exchange_only',
    '[{"src":"/placeholders/product-1.svg","alt":"Pearl Drop Earrings in Gold Tone, front view (placeholder image)","unoptimized":true},{"src":"/placeholders/product-2.svg","alt":"Pearl Drop Earrings in Gold Tone, detail view (placeholder image)","unoptimized":true},{"src":"/placeholders/product-3.svg","alt":"Pearl Drop Earrings in Gold Tone, worn view (placeholder image)","unoptimized":true}]',
    NOW() - INTERVAL '6 days', 52, 10
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'pearl-drop-earrings-gold-tone';
  INSERT INTO cat_variants (product_id, sku, price_paise, compare_at_paise, position)
    VALUES (v_id, 'KL-EAR-0001', 129900, 189900, 0)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock)
    VALUES ('KL-EAR-0001', v_id, 'Pearl Drop Earrings in Gold Tone', 12, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 2. Fine Pendant Chain (KL-NEC-0011, multi-variant: Length)
  --    women/necklaces | 3 lengths | placeholder images
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    option_name, attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, dimensions, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'fine-pendant-chain-gold-tone',
    'Fine Pendant Chain',
    'women', 'active', 'women/necklaces', ARRAY['women/necklaces'],
    'Length',
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold"],"occasion":["daily-wear","office-wear","gifting"],"style":["minimal"]}',
    'Fine Pendant Chain in gold tone brass, made for daily-wear, office-wear, gifting.',
    ARRAY[
      'The fine pendant chain is plated in gold tone over a brass base and finished by hand.',
      'It pairs with minimal looks and is light enough for all-day wear.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','Nickel-safe, skin-friendly base','Weighs about 5 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Wear short with a boat neck or high collar; go long with a V-neck or an open shirt.','Layer two lengths at least 5 cm apart so they never tangle.','Keep earrings small when the necklace is the hero.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    5, 'Chain 45 cm with 5 cm extender; pendant 1.5 cm', '7117', 300, 'returnable',
    '[{"src":"/placeholders/product-2.svg","alt":"Fine Pendant Chain, front view (placeholder image)","unoptimized":true},{"src":"/placeholders/product-3.svg","alt":"Fine Pendant Chain, detail view (placeholder image)","unoptimized":true}]',
    NOW() - INTERVAL '120 days', 47, 0
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'fine-pendant-chain-gold-tone';
  INSERT INTO cat_variants (product_id, sku, option_value, price_paise, position) VALUES
    (v_id, 'KL-NEC-0011-16INCH', '16 inch', 89900, 0),
    (v_id, 'KL-NEC-0011-18INCH', '18 inch', 89900, 1),
    (v_id, 'KL-NEC-0011-20INCH', '20 inch', 89900, 2)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock) VALUES
    ('KL-NEC-0011-16INCH', v_id, 'Fine Pendant Chain', 2, 0),
    ('KL-NEC-0011-18INCH', v_id, 'Fine Pendant Chain', 12, 0),
    ('KL-NEC-0011-20INCH', v_id, 'Fine Pendant Chain', 0, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 3. Stackable Band Ring Set of 3 (KL-RIN-0016, multi-variant: Size)
  --    women/rings | 4 sizes | placeholder images
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    option_name, attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'stackable-band-ring-set',
    'Stackable Band Ring Set of 3',
    'women', 'active', 'women/rings', ARRAY['women/rings'],
    'Size',
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold"],"occasion":["daily-wear","office-wear"],"style":["minimal"]}',
    'Stackable Band Ring Set of 3 in gold tone brass, made for daily-wear, office-wear.',
    ARRAY[
      'The stackable band ring set of 3 is plated in gold tone over a brass base and finished by hand.',
      'It pairs with minimal looks and is light enough for all-day wear.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','Nickel-safe, skin-friendly base','Weighs about 4 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Stack two slim bands with one textured ring; leave the index finger bare.','Keep stacks on one hand and a single ring on the other.','A signet on the little finger reads modern with minimal everything else.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    4, '7117', 300, 'returnable',
    '[{"src":"/placeholders/product-3.svg","alt":"Stackable Band Ring Set of 3, front view (placeholder image)","unoptimized":true},{"src":"/placeholders/product-1.svg","alt":"Stackable Band Ring Set of 3, detail view (placeholder image)","unoptimized":true}]',
    NOW() - INTERVAL '70 days', 41, 0
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'stackable-band-ring-set';
  INSERT INTO cat_variants (product_id, sku, option_value, price_paise, position) VALUES
    (v_id, 'KL-RIN-0016-10', '10', 74900, 0),
    (v_id, 'KL-RIN-0016-12', '12', 74900, 1),
    (v_id, 'KL-RIN-0016-14', '14', 74900, 2),
    (v_id, 'KL-RIN-0016-16', '16', 74900, 3)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock) VALUES
    ('KL-RIN-0016-10', v_id, 'Stackable Band Ring Set of 3', 2, 0),
    ('KL-RIN-0016-12', v_id, 'Stackable Band Ring Set of 3', 12, 0),
    ('KL-RIN-0016-14', v_id, 'Stackable Band Ring Set of 3', 12, 0),
    ('KL-RIN-0016-16', v_id, 'Stackable Band Ring Set of 3', 0, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 4. Fine Box Chain, Stainless Steel (KL-CHA-0029, multi-variant: Length)
  --    men/chains | 3 lengths | placeholder images
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    option_name, attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'fine-box-chain-stainless-steel',
    'Fine Box Chain, Stainless Steel',
    'men', 'active', 'men/chains', ARRAY['men/chains'],
    'Length',
    '{"material":["stainless-steel"],"finish":["silver-tone"],"color":["silver"],"occasion":["daily-wear","office-wear"],"style":["minimal"]}',
    'Fine Box Chain, Stainless Steel in silver tone stainless steel, made for daily-wear, office-wear.',
    ARRAY[
      'The fine box chain, stainless steel is finished in silver tone stainless steel and built for daily wear.',
      'It pairs with minimal looks and resists tarnish without any plating.'
    ],
    ARRAY['Silver tone finish, tarnish-resistant stainless steel','Skin-safe, hypoallergenic base','Weighs about 12 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['A 2 mm chain sits inside the collar; 4 mm and up sits outside.','Layer two chains with at least 5 cm difference in length.','Match the chain tone to your watch.'],
    'Stainless steel is safe for daily wear. Rinse and dry after contact with salt water.',
    12, '7117', 300, 'returnable',
    '[{"src":"/placeholders/product-3.svg","alt":"Fine Box Chain Stainless Steel, front view (placeholder image)","unoptimized":true},{"src":"/placeholders/product-2.svg","alt":"Fine Box Chain Stainless Steel, detail view (placeholder image)","unoptimized":true},{"src":"/placeholders/product-4.svg","alt":"Fine Box Chain Stainless Steel, worn view (placeholder image)","unoptimized":true}]',
    NOW() - INTERVAL '180 days', 64, 9
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'fine-box-chain-stainless-steel';
  INSERT INTO cat_variants (product_id, sku, option_value, price_paise, position) VALUES
    (v_id, 'KL-CHA-0029-18INCH', '18 inch', 89900, 0),
    (v_id, 'KL-CHA-0029-20INCH', '20 inch', 89900, 1),
    (v_id, 'KL-CHA-0029-22INCH', '22 inch', 89900, 2)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock) VALUES
    ('KL-CHA-0029-18INCH', v_id, 'Fine Box Chain, Stainless Steel', 2, 0),
    ('KL-CHA-0029-20INCH', v_id, 'Fine Box Chain, Stainless Steel', 12, 0),
    ('KL-CHA-0029-22INCH', v_id, 'Fine Box Chain, Stainless Steel', 0, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 5. Shiv Trishul CZ Pendant Set  (KL-PEN-0041) — REAL PHOTOS
  --    men/pendants | single variant | real product photography
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'shiv-trishul-pendant-set',
    'Shiv Trishul CZ Pendant Set',
    'men', 'active', 'men/pendants', ARRAY['men/pendants'],
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold"],"occasion":["daily-wear","gifting"],"style":["traditional"]}',
    'Shiv Trishul CZ Pendant Set in gold tone brass, made for daily-wear, gifting.',
    ARRAY[
      'The Shiv Trishul CZ pendant set features a detailed trishul motif with CZ stone accents in gold tone plated brass.',
      'Comes with a gold mesh chain. Meaningful everyday wear for devotees and gifting.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','CZ stone accents','Weighs about 14 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Sits best just below the collarbone over a crew neck.','Pair with a plain chain, never a second pendant.','Tuck it in under a shirt for a quieter look.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    14, '7117', 300, 'returnable',
    '[{"src":"/products/shiv-trishul-pendant-set/shiv-trishul-pendant-set-1.jpg","alt":"Shiv Trishul CZ pendant in gold tone, close-up view showing stone detail"},{"src":"/products/shiv-trishul-pendant-set/shiv-trishul-pendant-set-2.jpg","alt":"Shiv Trishul CZ pendant set with gold mesh chain, full view"}]',
    NOW() - INTERVAL '7 days', 18, 6
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'shiv-trishul-pendant-set';
  INSERT INTO cat_variants (product_id, sku, price_paise, compare_at_paise, position)
    VALUES (v_id, 'KL-PEN-0041', 129900, 179900, 0)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock)
    VALUES ('KL-PEN-0041', v_id, 'Shiv Trishul CZ Pendant Set', 12, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 6. Om Mandala CZ Pendant Set  (KL-PEN-0042) — REAL PHOTOS
  --    men/pendants | single variant | real product photography
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'om-mandala-pendant-set',
    'Om Mandala CZ Pendant Set',
    'men', 'active', 'men/pendants', ARRAY['men/pendants'],
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold"],"occasion":["daily-wear","gifting"],"style":["traditional"]}',
    'Om Mandala CZ Pendant Set in gold tone brass, made for daily-wear, gifting.',
    ARRAY[
      'The Om Mandala CZ pendant set features a circular mandala motif with CZ stone surround in gold tone plated brass.',
      'Comes with a gold mesh chain. A devotional yet modern pendant for everyday wear and gifting.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','CZ stone surround mandala design','Weighs about 12 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Sits best just below the collarbone over a crew neck.','Pair with a plain chain, never a second pendant.','Tuck it in under a shirt for a quieter look.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    12, '7117', 300, 'returnable',
    '[{"src":"/products/om-mandala-pendant-set/om-mandala-pendant-set-1.jpg","alt":"Om mandala pendant in gold tone, close-up view showing CZ stone surround"},{"src":"/products/om-mandala-pendant-set/om-mandala-pendant-set-2.jpg","alt":"Om mandala pendant set with gold mesh chain, full view"}]',
    NOW() - INTERVAL '7 days', 14, 5
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'om-mandala-pendant-set';
  INSERT INTO cat_variants (product_id, sku, price_paise, compare_at_paise, position)
    VALUES (v_id, 'KL-PEN-0042', 129900, 179900, 0)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock)
    VALUES ('KL-PEN-0042', v_id, 'Om Mandala CZ Pendant Set', 12, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 7. Triple CZ Adjustable Bracelet  (KL-BRA-0043) — REAL PHOTO
  --    women/bracelets | single variant | real product photography
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'triple-cz-adjustable-bracelet',
    'Triple CZ Adjustable Bracelet',
    'women', 'active', 'women/bracelets', ARRAY['women/bracelets'],
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold","white"],"occasion":["daily-wear","gifting","party-wear"],"style":["contemporary","minimal"]}',
    'Triple CZ Adjustable Bracelet in gold tone brass, made for daily-wear, gifting, party-wear.',
    ARRAY[
      'The Triple CZ adjustable bracelet features three sparkling CZ stones on a fine gold tone chain with a slider clasp.',
      'Adjustable fit suits all wrist sizes. Light and easy to layer or wear alone.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','Triple CZ stones','Adjustable slider clasp, fits all wrists','Weighs about 8 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['One chain plus one cuff is a complete stack.','Wear on the hand without a watch.','Push sleeves up a little so the bracelet shows.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    8, '7117', 300, 'returnable',
    '[{"src":"/products/triple-cz-adjustable-bracelet/triple-cz-adjustable-bracelet-1.jpg","alt":"Triple CZ adjustable bracelet in gold tone, worn view showing slider clasp"}]',
    NOW() - INTERVAL '5 days', 22, 7
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'triple-cz-adjustable-bracelet';
  INSERT INTO cat_variants (product_id, sku, price_paise, compare_at_paise, position)
    VALUES (v_id, 'KL-BRA-0043', 79900, 109900, 0)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock)
    VALUES ('KL-BRA-0043', v_id, 'Triple CZ Adjustable Bracelet', 12, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 8. CZ Solitaire Lariat Necklace  (KL-NEC-0044) — REAL PHOTO
  --    women/necklaces | single variant | real product photography
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'cz-solitaire-lariat-necklace',
    'CZ Solitaire Lariat Necklace',
    'women', 'active', 'women/necklaces', ARRAY['women/necklaces'],
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold","white"],"occasion":["party-wear","daily-wear","gifting"],"style":["contemporary","minimal"]}',
    'CZ Solitaire Lariat Necklace in gold tone brass, made for party-wear, daily-wear, gifting.',
    ARRAY[
      'The CZ Solitaire Lariat necklace features a single CZ solitaire stone on a fine box chain with an elegant tassel drop.',
      'The lariat style drapes freely for a modern, adjustable look that suits V-necks and open collars.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','CZ solitaire stone','Lariat (no clasp) — adjustable drape','Weighs about 9 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Wear short with a boat neck or high collar; go long with a V-neck or an open shirt.','Layer two lengths at least 5 cm apart so they never tangle.','Keep earrings small when the necklace is the hero.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    9, '7117', 300, 'returnable',
    '[{"src":"/products/cz-solitaire-lariat-necklace/cz-solitaire-lariat-necklace-1.jpg","alt":"CZ solitaire lariat necklace in gold tone, flat lay showing box chain and tassel drop"}]',
    NOW() - INTERVAL '4 days', 19, 8
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'cz-solitaire-lariat-necklace';
  INSERT INTO cat_variants (product_id, sku, price_paise, compare_at_paise, position)
    VALUES (v_id, 'KL-NEC-0044', 119900, 159900, 0)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock)
    VALUES ('KL-NEC-0044', v_id, 'CZ Solitaire Lariat Necklace', 12, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 9. CZ Snowflake Lariat Necklace  (KL-NEC-0045) — REAL PHOTO
  --    women/necklaces | single variant | real product photography
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'cz-snowflake-lariat-necklace',
    'CZ Snowflake Lariat Necklace',
    'women', 'active', 'women/necklaces', ARRAY['women/necklaces'],
    '{"material":["brass"],"finish":["gold-tone"],"color":["gold","white"],"occasion":["party-wear","gifting"],"style":["contemporary","statement"]}',
    'CZ Snowflake Lariat Necklace in gold tone brass, made for party-wear, gifting.',
    ARRAY[
      'The CZ Snowflake Lariat necklace features a starburst snowflake pendant with CZ stones on a fine box chain with a tassel drop.',
      'The lariat style drapes freely — no clasp, fully adjustable. A statement piece for parties and gifting.'
    ],
    ARRAY['Gold tone finish, anti-tarnish coated','CZ snowflake starburst pendant','Lariat (no clasp) — adjustable drape','Weighs about 9 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Wear short with a boat neck or high collar; go long with a V-neck or an open shirt.','Layer two lengths at least 5 cm apart so they never tangle.','Keep earrings small when the necklace is the hero.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    9, '7117', 300, 'returnable',
    '[{"src":"/products/cz-snowflake-lariat-necklace/cz-snowflake-lariat-necklace-1.jpg","alt":"CZ snowflake lariat necklace in gold tone, flat lay showing starburst pendant and tassel drop"}]',
    NOW() - INTERVAL '4 days', 11, 0
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'cz-snowflake-lariat-necklace';
  INSERT INTO cat_variants (product_id, sku, price_paise, compare_at_paise, position)
    VALUES (v_id, 'KL-NEC-0045', 109900, 149900, 0)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock)
    VALUES ('KL-NEC-0045', v_id, 'CZ Snowflake Lariat Necklace', 12, 0)
    ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 10. Antique Mangalsutra with Stone Pendant  (KL-NEC-0046) — REAL PHOTOS
  --     women/necklaces | single variant | real product photography
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO cat_products (
    slug, name, gender, status, primary_category_path, category_paths,
    attributes, short_description, description, highlights, styling_tips,
    care, weight_grams, hsn_code, gst_rate_bp, return_policy, images,
    published_at, sales_30d, sort_weight
  ) VALUES (
    'antique-mangalsutra',
    'Antique Mangalsutra with Stone Pendant',
    'women', 'active', 'women/necklaces', ARRAY['women/necklaces'],
    '{"material":["alloy"],"finish":["oxidised"],"color":["gold","multicolour","black"],"occasion":["wedding","daily-wear"],"style":["traditional","statement"]}',
    'Antique Mangalsutra with Stone Pendant in oxidised alloy, made for wedding, daily-wear.',
    ARRAY[
      'The Antique Mangalsutra features a traditional black bead chain with a multicolour stone floral pendant in oxidised alloy.',
      'Crafted in the traditional South Indian style with meticulous oxidised finish. Suitable for daily wear and weddings.'
    ],
    ARRAY['Oxidised finish, traditional look','Multicolour stone floral pendant','Black bead chain included','Weighs about 28 g','Arrives in a Kesa gift box with a care card'],
    ARRAY['Let the set carry the look: skip a bracelet and keep nails neutral.','With a heavy neckline, wear only the earrings from the set.','Pin hair back so the earrings show.'],
    'Keep away from perfume, water and sweat. Wipe with a soft dry cloth after wear and store in the pouch provided.',
    28, '7117', 300, 'returnable',
    '[{"src":"/products/antique-mangalsutra/antique-mangalsutra-1.jpg","alt":"Antique mangalsutra with black bead chain and multicolour stone floral pendant, full view"},{"src":"/products/antique-mangalsutra/antique-mangalsutra-2.jpg","alt":"Antique mangalsutra pendant close-up showing floral design with multicolour stone detail"}]',
    NOW() - INTERVAL '6 days', 27, 9
  ) ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_id FROM cat_products WHERE slug = 'antique-mangalsutra';
  INSERT INTO cat_variants (product_id, sku, price_paise, compare_at_paise, position)
    VALUES (v_id, 'KL-NEC-0046', 199900, 269900, 0)
    ON CONFLICT (sku) DO NOTHING;
  INSERT INTO product_variants (sku, product_id, product_name, available_stock, reserved_stock)
    VALUES ('KL-NEC-0046', v_id, 'Antique Mangalsutra with Stone Pendant', 12, 0)
    ON CONFLICT (sku) DO NOTHING;

END $$;
