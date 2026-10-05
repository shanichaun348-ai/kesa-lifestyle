# 05 — Database Design

PostgreSQL 16 (Supabase). Schema managed with Drizzle ORM migrations. All tables in schema `public` unless noted; Supabase manages `auth.*` and `storage.*`.

Conventions:
- Primary keys: `uuid` (`gen_random_uuid()`), except human-facing numbers (`order_number`, `invoice_number`) which are separate sequences.
- Money: `integer` **paise**. Never floats. Column names end with `_paise`.
- Timestamps: `timestamptz`, `created_at` / `updated_at` on every table (trigger-maintained `updated_at`).
- Soft delete only where history matters (`products`, `customers`): `archived_at` / `deleted_at`.
- Enums are Postgres enums for state machines; lookup tables for anything admins can extend.
- All tables have RLS **enabled** with deny-by-default for `anon`/`authenticated` (see §9 and `11_SECURITY_REQUIREMENTS.md`).

---

## 1. Entity overview

```
Catalog     : products, product_families, product_variants, product_options,
              product_option_values, variant_option_values, product_media, categories,
              product_categories, collections, collection_products, collection_rules,
              attributes, attribute_values, product_attribute_values, tags, product_tags,
              product_relations, care_templates, size_guides
Inventory   : locations, inventory_levels, inventory_movements, inventory_reservations
Customers   : customers, customer_addresses, customer_consents, admin_users
Cart        : carts, cart_items, wishlists, wishlist_items
Orders      : orders, order_items, order_addresses, order_events, order_notes,
              payments, payment_events, refunds, credit_notes, shipments, shipment_events,
              return_requests, return_items, invoices
Discounts   : discounts, discount_targets, discount_codes, discount_redemptions
Reviews     : reviews, review_media, review_votes
Growth      : referral_codes, referrals, loyalty_accounts, loyalty_transactions
Content     : pages, journal_posts, journal_categories, guides, guide_sections,
              homepage_sections, banners, navigation_menus, navigation_items,
              faqs, faq_groups, media_assets
SEO         : seo_settings, redirects, sitemap_entries (view), search_queries_log,
              search_synonyms, search_redirects
System      : settings, outbox_events, webhook_events, audit_logs, pincodes,
              feature_flags, email_templates (P1)
```

---

## 2. Catalog

### `products`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | immutable after publish; change → redirect |
| name | text | |
| short_description | text | ≤ 160 chars |
| description_md | text | Markdown |
| highlights | text[] | bullets |
| status | enum `product_status` (draft, active, archived) | |
| gender | enum `gender` (women, men, unisex) | trigger: product may only join categories whose gender matches, or any if `unisex` |
| primary_category_id | uuid FK categories | breadcrumb + schema |
| family_id | uuid FK product_families null | colour/finish siblings share a family (see SEO §1.10) |
| family_option_label | text null | e.g. "Silver", "Rose Gold" — this product's position in the family swatch row |
| attribute_value_ids | uuid[] | trigger-maintained aggregate of `product_attribute_values` for fast faceting (GIN) |
| brand | text default 'Kesa Lifestyle' | for feed |
| care_template_id | uuid FK care_templates null | |
| care_override_md | text null | |
| shipping_class | enum (standard, fragile) | |
| return_policy | enum (returnable, exchange_only, final_sale) | |
| return_policy_note | text null | |
| hsn_code | text | e.g. 7117 |
| gst_rate_bp | integer | basis points, e.g. 300 = 3% |
| country_of_origin | text default 'IN' | legal disclosure |
| seo_title / seo_description | text null | fallbacks computed |
| seo_keywords | text[] | internal only |
| canonical_override | text null | |
| noindex | boolean default false | |
| og_image_media_id | uuid null | |
| is_featured | boolean | |
| sort_weight | integer default 0 | |
| published_at | timestamptz null | drives "new" badge |
| archived_at | timestamptz null | |
| search_vector | tsvector | regular column (not GENERATED, because it reads attribute labels from other tables); maintained by trigger on products and product_attribute_values: name A, highlights B, attribute labels B, description C; synonyms applied at query time via `search_synonyms` |
| rating_avg | numeric(3,2) null | denormalised from reviews |
| rating_count | integer default 0 | |
| sales_30d | integer default 0 | cron-updated; bestseller rule |
| created_at / updated_at | | |

Indexes: `slug`, `(status, gender)`, `primary_category_id`, `published_at desc`, `sales_30d desc`, GIN on `search_vector`, GIN trigram on `name`.

### `product_families`
`(id, name, created_at)`. Groups colour/finish sibling products. The PDP renders an "Also available in" row from `products where family_id = ?`; the feed uses it as `item_group_id`; schema emits one family `ProductGroup` node. Variants (below) are reserved for size/length only (ADR-29).

### `product_options` / `product_option_values` / `product_variants` / `variant_option_values`
- `product_options(id, product_id, name, position)` — e.g. "Size", "Length".
- `product_option_values(id, option_id, value, position)` — e.g. "7", "18 inch".
- `product_variants(id, product_id, sku UNIQUE, title, price_paise, compare_at_price_paise null, sale_price_paise null, sale_starts_at null, sale_ends_at null, cost_price_paise null, weight_g, length_mm, width_mm, height_mm, barcode null, media_id null, is_default boolean, position, status, created_at, updated_at)`.
- `variant_option_values(variant_id, option_value_id)` PK composite.
- Every product has ≥ 1 variant; single-variant products have `is_default = true` and no options.

**Effective price** is computed in SQL (view `variant_prices`): `sale_price_paise` if within schedule, else `price_paise`. Compare-at shown only when > effective.

### `product_media`
`(id, product_id, variant_id null, media_asset_id, role enum(primary, gallery, lifestyle, detail, video), alt_text NOT NULL, position)`. Unique partial index: one `primary` per product.

### `media_assets`
`(id, storage_path, kind enum(image, video), mime_type, width, height, bytes, blurhash null, external_url null, external_provider enum(youtube, vimeo) null, created_by, created_at)`. Single registry for Supabase Storage objects and external video IDs.

### `categories`
`(id, slug, name, gender enum, parent_id null, path text /* e.g. women/earrings */ UNIQUE, intro_md, body_md, faq_group_id null, image_media_id null, seo_title, seo_description, noindex, position, is_visible, created_at, updated_at)`. Depth ≤ 2 enforced by trigger.

### `product_categories`
`(product_id, category_id)` composite PK. `products.primary_category_id` must also appear here (trigger).

### `collections` / `collection_products` / `collection_rules`
- `collections(id, slug UNIQUE, name, kind enum(manual, rule), heading, intro_md, body_md, image_media_id, faq_group_id, seo_title, seo_description, noindex, is_visible, sort_default enum, starts_at, ends_at, position, created_at, updated_at)`.
- `collection_products(collection_id, product_id, position)` — for manual, and as a **materialised membership** for rule collections, so PLP queries are a simple join. Recompute is **asynchronous**: a trigger on product change only enqueues an `outbox_events` row (`recompute_collections_for_product`); the worker re-evaluates rules for that product. A nightly cron recomputes all rule collections. Synchronous recompute in the trigger was rejected because it would make every product save O(collections) and lock-heavy at scale.
- `collection_rules(id, collection_id, field enum(tag, attribute_value, category, price, published_within_days, sales_30d_rank, gender), operator enum(eq, neq, in, gte, lte), value jsonb, position)`. Rules AND-combined within a collection (v1).

### `attributes` / `attribute_values` / `product_attribute_values`
- `attributes(id, key UNIQUE /* material */, name, kind enum(single, multi), is_filterable, is_spec, position)`.
- `attribute_values(id, attribute_id, slug, label, swatch_hex null, position)`; unique `(attribute_id, slug)`.
- `product_attribute_values(product_id, attribute_value_id)` composite PK; trigger enforces `single` kind cardinality.

Seeded attributes: `material`, `finish`, `color`, `occasion`, `style`, `closure`, `stone`.

### `tags` / `product_tags`
`tags(id, slug UNIQUE, name)`; `product_tags(product_id, tag_id)`.

### `product_relations`
`(product_id, related_product_id, kind enum(complete_the_look, similar, manual), position)`.

### `care_templates`
`(id, name, body_md)` — e.g. "Gold-plated care", "Oxidised care".

---

## 3. Inventory

### `locations`
`(id, code UNIQUE, name, address…, is_default, is_active)`. One row at launch (the warehouse). Added now because retrofitting a location dimension onto inventory primary keys and ledgers later is a painful migration.

### `inventory_levels`
`(variant_id, location_id, on_hand integer, reserved integer, low_stock_threshold integer default 5, track_inventory boolean default true, allow_backorder boolean default false, updated_at)`, PK `(variant_id, location_id)`. `available = on_hand - reserved` (generated column). Check constraint `reserved <= on_hand` unless backorder. Storefront availability sums across active locations.

### `inventory_reservations`
`(id, variant_id, quantity, cart_id null, order_id null, expires_at, status enum(active, consumed, released))`. Reservation created at checkout start (10-minute TTL), consumed on payment, released by cron if expired.

### `inventory_movements`
Append-only ledger: `(id, variant_id, delta, reason enum(receive, sale, return, adjustment, damage, reservation_consume, correction), reference_type, reference_id, note, actor_id, created_at)`. `on_hand` is maintained from this ledger inside the same transaction.

---

## 4. Customers and auth

### `customers`
`(id PK = auth.users.id, email, phone null, first_name, last_name, accepts_marketing boolean, tags text[], notes_internal text, is_blocked boolean, risk_flags text[], orders_count integer, total_spent_paise bigint, last_order_at, deleted_at, created_at, updated_at)`. Row created by trigger on `auth.users` insert. Default address is expressed only by `customer_addresses.is_default_shipping` (partial unique index per customer), avoiding a circular FK. Lifetime aggregates are `bigint`.

### `customer_addresses`
`(id, customer_id, label, full_name, phone, line1, line2, landmark, city, state, pincode, country default 'IN', is_default_shipping, is_default_billing, created_at, updated_at)`.

### `customer_consents`
`(id, customer_id null, email, channel enum(email, sms, whatsapp), topic enum(transactional, offers, new_arrivals, journal), status enum(opted_in, opted_out), source, ip_hash, user_agent, recorded_at)`. Append-only; current state = latest row. Satisfies DPDP consent record keeping.

### `admin_users`
`(user_id PK FK auth.users, role enum(owner, manager, catalog_editor, support, content_editor), is_active, created_at)`. Only rows here may access `/admin`.

---

## 5. Cart and wishlist

### `carts`
`(id, customer_id null, token uuid UNIQUE /* cookie */, currency default 'INR', discount_code_id null, note, status enum(active, merged, converted, abandoned), expires_at, created_at, updated_at)`.

### `cart_items`
`(id, cart_id, variant_id, quantity, price_paise_at_add, created_at, updated_at)`; unique `(cart_id, variant_id)`. Prices are re-read from `variant_prices` on every render; `price_paise_at_add` is only for "price changed" notices.

### `wishlists` / `wishlist_items`
`wishlists(id, customer_id null, token uuid, share_slug null)`; `wishlist_items(wishlist_id, product_id, variant_id null, created_at)`.

---

## 6. Orders, payments, fulfilment

### `orders`
| Column | Notes |
|---|---|
| id uuid, order_number text UNIQUE (`KL-100234`) | sequence-based, prefix configurable |
| customer_id null, guest_email, guest_phone | guest orders keep contact here |
| status enum `order_status` | `pending_payment → paid/confirmed → processing → shipped → delivered → completed`; `cancelled`, `payment_failed`, `refunded`, `partially_refunded`, `rto` |
| payment_status enum | `pending, authorized, paid, failed, refunded, partially_refunded, cod_pending, cod_collected` |
| fulfilment_status enum | `unfulfilled, partially_fulfilled, fulfilled, returned` |
| payment_method enum | `razorpay, cod` |
| subtotal_paise, discount_paise, shipping_paise, cod_fee_paise, tax_paise, total_paise | tax is inclusive (MRP pricing) but stored for invoices |
| discount_code_id null, discount_snapshot jsonb | |
| shipping_method, shipping_estimate_min/max date | |
| currency 'INR' | |
| cart_id, source enum(web), utm jsonb, ga_client_id text null, ip_hash, user_agent | attribution; `ga_client_id` lets server-side GA4 purchase events join the session |
| idempotency_key uuid UNIQUE | generated by the client per checkout attempt; a double submit returns the existing order instead of creating a second one |
| gift_wrap boolean, gift_message text null | gifting is core to jewellery; wrap fee is a line in totals |
| risk_flags text[] | e.g. `cod_phone_mismatch`, `multiple_failed_payments`, `address_similarity`; surfaced in admin |
| needs_review boolean | set when webhook amount mismatches or risk rules trigger |
| placed_at, paid_at, cancelled_at, cancel_reason, completed_at | |
| created_at, updated_at | |

### `order_items`
`(id, order_id, variant_id, product_id, sku, product_name, variant_title, image_url, quantity, unit_price_paise, compare_at_paise, discount_paise, tax_rate_bp, tax_paise, line_total_paise, hsn_code, return_policy, fulfilled_quantity, returned_quantity)`. Snapshot columns so orders survive catalogue edits.

### `order_addresses`
`(id, order_id, kind enum(shipping, billing), full_name, phone, line1, line2, landmark, city, state, pincode, country)`.

### `order_events`
Append-only timeline: `(id, order_id, type, data jsonb, actor_type enum(system, customer, admin), actor_id, created_at)`.

### `order_notes`
`(id, order_id, body, author_id, created_at)` — internal.

### `payments`
`(id, order_id, provider enum(razorpay, cod), provider_order_id, provider_payment_id UNIQUE null, amount_paise, status enum(created, authorized, captured, failed, refunded), method text /* upi, card… */, raw jsonb, created_at, updated_at)`.

### `payment_events`
`(id, payment_id null, provider, provider_event_id UNIQUE, type, payload jsonb, processed_at, created_at)` — idempotency for webhooks.

### `refunds`
`(id, order_id, payment_id, provider_refund_id, idempotency_key UNIQUE, amount_paise, reason, status, initiated_by, credit_note_id null, created_at, processed_at)`. The idempotency key is sent to Razorpay so a retried admin action cannot refund twice.

### `credit_notes`
`(id, order_id, invoice_id, credit_note_number UNIQUE, issued_at, amount_paise, cgst_paise, sgst_paise, igst_paise, reason, pdf_media_id, snapshot jsonb)`. GST law requires a credit note against the original tax invoice for every refund or return; numbered sequentially per financial year like invoices.

### `shipments`
`(id, order_id, provider enum(shiprocket, manual), provider_shipment_id, courier_name, awb, label_url, status enum(created, pickup_scheduled, in_transit, out_for_delivery, delivered, rto_initiated, rto_delivered, cancelled, lost), tracking_url, shipped_at, delivered_at, created_at, updated_at)`; `shipment_items(shipment_id, order_item_id, quantity)`.

### `shipment_events`
`(id, shipment_id, status, location, description, occurred_at, raw jsonb)`.

### `return_requests` / `return_items`
`(id, order_id, customer_id, type enum(return, exchange), reason, status enum(requested, approved, rejected, pickup_scheduled, received, refunded, exchanged, closed), resolution_note, refund_id null, created_at, updated_at)`; items `(return_request_id, order_item_id, quantity, condition_note, exchange_variant_id null)`.

### `invoices`
`(id, order_id UNIQUE, invoice_number UNIQUE, issued_at, pdf_media_id, seller_gstin, buyer_state_code, place_of_supply, cgst_paise, sgst_paise, igst_paise, snapshot jsonb)`.

---

## 7. Discounts, reviews, growth

### `discounts`
`(id, name, kind enum(code, automatic), value_type enum(percent, fixed, free_shipping, bxgy), value integer, applies_to enum(order, products, collections, categories), min_subtotal_paise, max_discount_paise, first_order_only, customer_eligibility enum(all, specific, segments), usage_limit_total, usage_limit_per_customer, combinable_with enum(none, shipping), starts_at, ends_at, is_active, created_at, updated_at)`.

### `discount_targets`
`(discount_id, target_type enum(product, collection, category), target_id)` composite PK with FK integrity via per-type partial constraints (one nullable FK column per type, exactly one non-null). Replaces a `uuid[]` array, which would leave dangling IDs when a product is archived and cannot be indexed for "which discounts apply to this product".

### `discount_codes`
`(id, discount_id, code UNIQUE (citext), usage_count)`; `discount_redemptions(id, discount_id, code_id, order_id, customer_id, amount_paise, created_at)`.

### `reviews`
`(id, product_id, customer_id, order_item_id null, rating smallint 1–5, title, body, is_verified_purchase, status enum(pending, approved, rejected), admin_reply, admin_reply_at, helpful_count, created_at, updated_at)`; unique `(order_item_id)` when not null. `review_media(id, review_id, media_asset_id)`. `review_votes(review_id, customer_id, vote)`.

### `referral_codes` / `referrals`
`referral_codes(id, customer_id UNIQUE, code UNIQUE)`; `referrals(id, referrer_id, referee_id UNIQUE, referee_order_id, status enum(pending, qualified, rewarded, void), rewarded_at)`.

### `loyalty_accounts` / `loyalty_transactions`
`loyalty_accounts(customer_id PK, balance_points, lifetime_points, tier enum)`; `loyalty_transactions(id, customer_id, delta_points, kind enum(earn, redeem, expire, adjust, referral), order_id null, expires_at, note, created_at)`. Ledger-first so balances are auditable.

---

## 8. Content and SEO

### `pages`
`(id, slug UNIQUE, title, body_md, kind enum(policy, brand, utility), seo_title, seo_description, noindex, status, published_at, version, created_at, updated_at)`; `page_versions(page_id, version, body_md, author_id, created_at)`.

### `journal_categories` / `journal_posts`
`journal_posts(id, slug UNIQUE, title, excerpt, body_md, cover_media_id, category_id, author_name, status, published_at, reading_minutes, seo_title, seo_description, noindex, created_at, updated_at)`; `journal_post_products(post_id, product_id, position)`; `journal_post_collections(post_id, collection_id)`.

### `guides` / `guide_sections`
`guides(id, slug UNIQUE, kind enum(gift, style), title, intro_md, cover_media_id, faq_group_id, author_name, seo_title, seo_description, status, published_at, created_at, updated_at)`; `guide_sections(id, guide_id, position, kind enum(editorial, product_set, collection_embed, image, tip), heading, body_md, collection_id null, media_id null)`; `guide_section_products(section_id, product_id, position)` (join table rather than a `uuid[]`, so archived products drop out cleanly and "where is this product featured" is queryable).

### `size_guides`
`(id, key UNIQUE /* ring, bracelet, chain */, title, body_md, table jsonb)`. Linked from products by `products.size_guide_key null`; rendered as a dialog on PDP and at `/size-guide/`.

### `search_synonyms` / `search_redirects`
`search_synonyms(id, term, synonyms text[])` — e.g. `jhumka → jhumki, jhumkas, earrings`; `payal → anklet`; `kada → bracelet`. Applied when building the `tsquery`. `search_redirects(id, query_normalised UNIQUE, target_path)` — e.g. "returns" → `/returns-policy/`. Both admin-managed; essential for a bilingual Indian vocabulary.

### `homepage_sections`
`(id, position, kind enum(hero, category_grid, collection_tiles, product_carousel, editorial, journal_teasers, testimonials, newsletter), config jsonb (Zod-validated per kind), is_visible, starts_at, ends_at, updated_at)`.

### `banners`
`(id, placement enum(announcement, plp_top, pdp_below_cart), text, link, starts_at, ends_at, is_active)`. Constraint: max one active announcement at a time (exclusion constraint on time range).

### `navigation_menus` / `navigation_items`
`navigation_menus(id, key UNIQUE /* header, footer_shop… */, name)`; `navigation_items(id, menu_id, parent_id, label, target_type enum(category, collection, page, journal, guide, url), target_id, url, image_media_id, position, is_visible)`.

### `faq_groups` / `faqs`
`faq_groups(id, key, name)`; `faqs(id, group_id, question, answer_md, position)`.

### `seo_settings`
Global defaults only, as a single row: `(title_template, default_description, default_og_media_id, organization jsonb /* sameAs, contactPoint */, robots_extra)`. Per-entity SEO lives on the entity tables themselves; a second override table was removed because two sources of truth for the same field invite drift.

### `redirects`
`(id, from_path UNIQUE, to_path, status_code smallint default 301, source enum(manual, slug_change, import), hits integer, last_hit_at, is_active, created_at)`. Loaded into the request proxy via a cached lookup (tag `redirects`).

### `search_queries_log`
`(id, query_normalised, results_count, session_hash, created_at)` — aggregated nightly into `search_query_stats`.

---

## 9. System tables

- `settings(key PK, value jsonb, updated_by, updated_at)` — store details, COD rules, shipping rules, GST config. Secrets never stored here.
- `pincodes(pincode PK, city, state, state_code, is_cod_available, is_serviceable, zone, updated_at)` — seeded from a public dataset + Shiprocket serviceability cache.
- `outbox_events(id, type, payload jsonb, status enum(pending, processing, done, failed, dead), attempts, next_attempt_at, last_error, created_at, processed_at)` — index `(status, next_attempt_at)`.
- `webhook_events(id, provider, provider_event_id UNIQUE, signature_valid, payload jsonb, received_at, processed_at, error)`.
- `audit_logs(id, actor_id, actor_role, action, entity_type, entity_id, before jsonb, after jsonb, ip_hash, created_at)` — written by every admin action.
- `feature_flags(key PK, enabled, rollout_percent, updated_at)`.
- `email_templates` (P1) — overrides for subject/intro copy; layout stays in code.

---

## 10. Row-Level Security model

Principles (details in `11_SECURITY_REQUIREMENTS.md §6`):

1. **RLS enabled on every table.** No policies for `anon`. Supabase Data API exposure of `public` is disabled; the only Supabase client usage in the browser is Auth.
2. **`authenticated` role policies** exist only for tables a customer may read about themselves, as defence in depth: `customers` (self), `customer_addresses` (self), `orders`/`order_items` (self, read-only), `wishlists`, `reviews` (own), `loyalty_*` (self read). These are not used by the app's main path but protect against misconfiguration.
3. **Application role `kesa_app`** (used by Drizzle) has `BYPASSRLS = false` and explicit policies granting full access; this keeps every access path policy-governed while allowing the server to act as the trusted gateway. The server enforces customer/admin authorisation in code before every query.
4. **Storage policies:** product media bucket public-read, write only via server (service role in server code); `review-media` write via signed upload URL scoped to the customer; `invoices` private, served via short-lived signed URL after ownership check.

---

## 11. Key indexes and performance notes

- PLP query: `products` ⋈ `product_categories` (or `collection_products`) ⋈ `variant_prices` ⋈ `product_attribute_values` with GIN index on an aggregated `attribute_value_ids uuid[]` column maintained by trigger on `products` (avoids N-way joins for facets). Facet counts computed per request with a single `GROUP BY` over the filtered set; cached 60s per URL.
- Search: `search_vector @@ websearch_to_tsquery('english', q)` ranked by `ts_rank_cd`, falling back to `similarity(name, q) > 0.3` (pg_trgm) when FTS returns < 3 results.
- Bestsellers: `sales_30d` recomputed nightly from `order_items` joined to paid orders.
- Orders admin list: indexes on `(status, placed_at desc)`, `customer_id`, `order_number`, trigram on `guest_email`.
- Outbox: partial index on `status = 'pending'`.

---

## 11a. Integrity rules (review findings)

- Products, variants and media referenced by `order_items` are never hard-deleted: FKs are `ON DELETE RESTRICT`; archive instead.
- Postgres enums are only ever extended with `ALTER TYPE … ADD VALUE`; renaming/removing a value requires a new type and migration, so state names are chosen carefully up front.
- JSONB config (`homepage_sections.config`) may reference product/collection IDs; renderers skip missing targets and the admin shows a "broken reference" warning rather than failing the page.
- Connection pooling runs in transaction mode (Supavisor), so the Drizzle/`postgres.js` client is configured with `prepare: false`; session-level features (advisory locks across statements, `SET` outside a transaction) are not used.

## 12. Migrations and seeding

- `pnpm db:generate` (drizzle-kit) → SQL migration; hand-edited SQL migrations for triggers, RLS policies, enums, generated columns live alongside with ordered filenames.
- `pnpm db:migrate` runs in CI against a fresh Postgres before tests and against staging/production via a protected GitHub Action (manual approval for production).
- Seed: attributes, care templates, categories, settings, navigation, FAQ groups, 30 sample products with images for local development. Seed data is clearly marked and never run against production.
- Backups: Supabase daily backups + PITR (Pro plan). Restore drill documented in the roadmap Phase 2.

---

## 13. Entity relationship diagram (condensed)

```
categories 1─* product_categories *─1 products 1─* product_variants 1─1 inventory_levels
   │                                   │  │ └─* variant_option_values *─1 product_option_values *─1 product_options
   │                                   │  ├─* product_media *─1 media_assets
   │                                   │  ├─* product_attribute_values *─1 attribute_values *─1 attributes
   │                                   │  ├─* product_tags *─1 tags
   │                                   │  ├─* collection_products *─1 collections 1─* collection_rules
   │                                   │  └─* reviews *─1 customers
   │                                   └─* product_relations
customers 1─* customer_addresses
customers 1─* carts 1─* cart_items *─1 product_variants
customers 1─* orders 1─* order_items ; orders 1─* payments 1─* payment_events ; orders 1─* shipments 1─* shipment_events
orders 1─* order_events ; orders 1─* refunds ; orders 1─1 invoices ; orders 1─* return_requests 1─* return_items
discounts 1─* discount_codes 1─* discount_redemptions *─1 orders
customers 1─1 referral_codes ; customers 1─* referrals ; customers 1─1 loyalty_accounts 1─* loyalty_transactions
journal_posts *─1 journal_categories ; guides 1─* guide_sections ; navigation_menus 1─* navigation_items
outbox_events, webhook_events, audit_logs, settings, redirects, pincodes (standalone)
```
