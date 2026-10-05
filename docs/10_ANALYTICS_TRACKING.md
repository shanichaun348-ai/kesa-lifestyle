# 10 — Analytics & Tracking

What we measure, how events are named, which tools receive them, how consent is handled, and which dashboards exist. Principle: **one `track()` function, one event dictionary, minimal client JavaScript, server-side truth for revenue.**

---

## 1. Tooling

| Tool | Purpose | Load condition |
|---|---|---|
| **GA4** (gtag.js) | Acquisition, behaviour, ecommerce funnel; required for Search Console, Merchant Center and Google Ads linking | After analytics consent; loaded via `next/script` `afterInteractive` |
| **GA4 Measurement Protocol** (server) | `purchase`, `refund` sent from the order service with `transaction_id` for accuracy and dedup with client events | Always (server-side, no consent dependency for transactional accounting; user_id only with consent) |
| **Vercel Web Analytics + Speed Insights** | Cookieless page views and real-user Core Web Vitals | Always (privacy-friendly, no consent needed) |
| **Google Search Console** | Organic queries, coverage, CWV, rich results | n/a |
| **Google Merchant Center** | Feed health, free listings performance | n/a |
| **Sentry** | Errors and performance traces | Always (no PII) |
| **Meta Pixel + Conversions API** | Only if/when running Meta ads (D15) | After marketing consent; CAPI server-side with hashed identifiers |
| **Internal event store** (Postgres `analytics_events`, sampled) | Conversion funnel for the admin dashboard without depending on GA4 API quotas; search logs; zero-result queries | Always, anonymised (no consent needed: first-party, no cross-site identifiers). **Never written synchronously on the request path**: events are buffered (Vercel Runtime Cache / in-memory per instance) and flushed by a 5-minute cron in batches; page-view class events are sampled at 10%, commerce events at 100%. |

Not used: Google Tag Manager (adds JS weight and an unaudited injection surface; events are coded explicitly), Hotjar/session recording (privacy, performance — may be revisited with consent in Phase 4).

---

## 2. Consent model (DPDP-aligned, lightweight)

- Compact bottom sheet on first visit: "We use analytics cookies to improve Kesa. Accept / Essentials only / Manage".
- Categories: `essential` (always), `analytics`, `marketing`.
- Stored in a first-party cookie `kesa_consent` (1 year) and, for logged-in users, in `customer_consents`.
- GA4 uses Consent Mode v2 (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`) initialised as `denied` and updated on choice; no cookieless pings before consent.
- Consent choice can be changed from the footer link.

---

## 3. Event dictionary

Events follow GA4 recommended ecommerce names so reports work out of the box; custom events are prefixed `kesa_`. All events are emitted through `track(name, params)` from `lib/analytics.ts`, which no-ops without consent (except server events).

### 3.1 Ecommerce (GA4 standard)

| Event | Trigger | Params |
|---|---|---|
| `view_item_list` | PLP/collection/search render (client, after hydration, once per list) | `item_list_id`, `item_list_name`, `items[]` (first 24) |
| `select_item` | Product card click | `item_list_id`, `items[1]` |
| `view_item` | PDP render | `currency`, `value`, `items[1]` |
| `add_to_wishlist` | Wishlist toggle on | `items[1]` |
| `add_to_cart` / `remove_from_cart` | Cart mutations | `items[]`, `value` |
| `view_cart` | Cart drawer/page open | `items[]`, `value` |
| `begin_checkout` | Checkout page load | `items[]`, `value`, `coupon` |
| `add_shipping_info` | Address + method confirmed | `shipping_tier` |
| `add_payment_info` | Payment method chosen | `payment_type` |
| `purchase` | Confirmation page (client) **and** server MP on `paid`/`confirmed` with same `transaction_id` | `transaction_id`, `value`, `tax`, `shipping`, `coupon`, `payment_type` (razorpay_upi / razorpay_card / cod …), `items[]` |
| `view_promotion` / `select_promotion` | Homepage section or banner enters viewport / is clicked | `promotion_id` (section/banner id), `promotion_name`, `creative_slot` (position) |
| `refund` | Server MP on refund processed | `transaction_id`, `value`, `items[]` (partial) |

`items[]` shape: `item_id` (SKU), `item_name`, `item_brand`, `item_category` (gender), `item_category2` (type), `item_variant`, `price`, `quantity`, `discount`, `index`, `item_list_name`.

### 3.2 Engagement and discovery (custom)

| Event | Params |
|---|---|
| `search` (GA4 standard) | `search_term`, `results_count` |
| `kesa_filter_apply` | `filter_key`, `filter_value`, `page_type` |
| `kesa_sort_change` | `sort` |
| `kesa_variant_select` | `item_id`, `option`, `value` |
| `kesa_pincode_check` | `serviceable`, `cod_available` (no pincode value) |
| `kesa_gallery_video_play` | `item_id` |
| `kesa_size_guide_open` | `item_id` |
| `kesa_review_submit` | `item_id`, `rating` |
| `kesa_newsletter_signup` | `placement` |
| `kesa_coupon_apply` | `result` (applied / invalid / expired / min_not_met) |
| `kesa_guide_product_click` | `guide_slug`, `item_id` |
| `kesa_journal_read` | `slug`, `percent` (25/50/75/100) |
| `kesa_wishlist_share` | — |
| `kesa_referral_share` | `channel` |
| `login`, `sign_up` (GA4 standard) | `method` |
| `kesa_checkout_error` | `step`, `code` |

### 3.3 Server-side operational events (internal store + logs)

`order_placed`, `payment_captured`, `payment_failed`, `cod_confirmed`, `shipment_created`, `delivered`, `return_requested`, `refund_processed`, `job_failed`, `webhook_invalid_signature`, `search_zero_results`.

---

## 4. Identity and attribution

- GA4 `user_id` set for logged-in users **only with analytics consent**; `client_id` persisted by GA.
- **Server-side purchase events need the session's `client_id`.** The checkout client reads it from the `_ga` cookie (with consent) and sends it with the place-order action; it is stored on `orders.ga_client_id` and used by the Measurement Protocol call. Without this the server `purchase` lands in GA4 as an orphan with no source/medium, which breaks every acquisition report.
- If consent was refused, the server event is still sent with a random `client_id` so revenue totals stay correct, just unattributed.
- UTM parameters and `gclid`/`fbclid` captured on landing into a first-party cookie (30 days) and stored on the order (`orders.utm`) for first-party attribution in the admin dashboard.
- Referral and coupon attribution stored on the order.
- No cross-site tracking beyond consented marketing pixels.

---

## 5. Dashboards and reports

### Admin dashboard (in-app, from Postgres)
- Revenue, orders, AOV, units (today / 7d / 30d / custom), by payment method, by source (UTM), by category.
- Funnel: sessions with `view_item` → `add_to_cart` → `begin_checkout` → `purchase` (from internal sampled events).
- Top products, top searches, zero-result searches, low stock, pending reviews, failed outbox jobs, COD RTO rate.
- Discount performance: redemptions, revenue, discount cost.

### GA4 (standard explorations)
- Acquisition by channel; landing page performance; ecommerce purchase journey; item performance.
- Custom dimensions: `page_type`, `item_list_name`, `customer_type` (new/returning), `consent_state`.

### Search Console / Merchant Center
- Non-brand organic clicks by page type (configure page groups by URL prefix).
- Free listings clicks, feed disapprovals.

### Performance
- Vercel Speed Insights (field CWV by route), Lighthouse CI in PRs (`12_PERFORMANCE_REQUIREMENTS.md`).

---

## 6. Data quality rules

- `purchase` dedup: GA4 handles duplicate `transaction_id` within a property; client event fires only once per confirmation view (guarded by a cookie).
- Prices in events are rupees as decimals (`1299.00`), converted from paise at the edge.
- Item IDs are SKUs everywhere (events, feed, structured data) for cross-tool joins.
- Events are typed: `track` accepts a discriminated union generated from the dictionary; unknown events fail typecheck.
- A `?debug_analytics=1` query flag logs events to console in preview environments (never in production).
- CI test asserts that each storefront page type emits its required view event.

---

## 7. Privacy and retention

- GA4 data retention set to 14 months; IP anonymisation is default in GA4.
- Internal `analytics_events` retains 13 months then aggregates.
- No PII (email, phone, address, pincode) is sent to third-party analytics. Hashed identifiers only for consented marketing CAPI.
- Privacy policy lists each tool, purpose and retention.
