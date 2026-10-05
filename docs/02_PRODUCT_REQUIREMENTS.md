# 02 — Product Requirements

Functional requirements for the Kesa Lifestyle platform. Each requirement has an ID (`PR-xxx`) so later tickets and tests can reference it. Priority: **P0** = must ship for launch (end of Phase 2), **P1** = required within the first growth phase, **P2** = planned, architecture must allow it.

Detailed commerce rules (pricing, inventory, tax, payments, shipping, returns) are in `08_ECOMMERCE_REQUIREMENTS.md`. SEO behaviour of every page is in `06_SEO_STRATEGY.md`.

---

## 1. Storefront pages

| ID | Page | Priority | Key requirements |
|---|---|---|---|
| PR-001 | Homepage | P0 | Editorial hero, curated collection tiles, "New Arrivals", "Bestsellers", gender entry points, journal teasers, brand story strip, newsletter capture. All sections admin-managed and reorderable. |
| PR-002 | Women landing (`/women/`) | P0 | Category tiles (necklaces, earrings, rings, bracelets, bangles, jewellery sets), featured collections, product grid, intro copy (indexable). |
| PR-003 | Men landing (`/men/`) | P0 | Same template as Women with men's categories (chains, bracelets, rings, pendants). |
| PR-004 | Category PLP (`/women/earrings/`) | P0 | Product grid, filters (price, material, finish, color, occasion, style, availability), sort, pagination, indexable intro + FAQ copy, breadcrumbs. |
| PR-005 | Collection PLP (`/collections/[slug]/`) | P0 | Manual or rule-based product set, editorial header image/copy, same grid/filters. |
| PR-006 | New Arrivals, Bestsellers | P0 | Rule-based collections (by publish date / sales velocity). |
| PR-007 | Product detail page | P0 | Gallery (images + optional video), name, price/compare-at, variant selector, stock state, add to cart, wishlist, delivery estimate by pincode, description, specifications (material, finish, color, dimensions, weight), care, shipping & returns summary, reviews, related products, breadcrumbs, structured data. |
| PR-008 | Search | P0 | Instant suggestions (products, categories, collections) + results page with filters. Typo tolerance. Zero-results state with suggestions. |
| PR-009 | Wishlist | P0 | Guest (cookie) and account wishlist; merge on login; share link (P2). |
| PR-010 | Cart | P0 | Drawer + full page; quantity updates; coupon entry; shipping estimate; persistence across sessions/devices for logged-in users. |
| PR-011 | Checkout | P0 | Single-page, mobile-optimised: contact → address → shipping method → payment. Guest checkout. Address autofill by pincode (city/state). Gift wrap + gift message option. Idempotent order placement. Order summary always visible. |
| PR-012 | Order confirmation | P0 | Order number, items, totals, delivery estimate, account creation prompt for guests. |
| PR-013 | Account dashboard | P0 | Orders, addresses, wishlist, reviews, profile, preferences, logout. |
| PR-014 | Order detail & tracking | P0 | Status timeline, shipment tracking link, invoice download, return/exchange request (P1). |
| PR-015 | Reviews | P1 | Write review with rating, title, body, photos; verified-purchase badge; moderation before publish. |
| PR-016 | About Kesa | P0 | Brand story, craftsmanship, values. Editorial layout. |
| PR-017 | Contact | P0 | Form (spam-protected), email, WhatsApp link, hours. |
| PR-018 | FAQ | P0 | Grouped accordion; `FAQPage` schema; admin-managed. |
| PR-019 | Policies (Shipping, Returns, Privacy, Terms) | P0 | Admin-managed rich text; versioned; last-updated date. |
| PR-020 | Jewellery care guide | P0 | Evergreen SEO content; links to products. |
| PR-021 | Journal (`/journal/`, `/journal/[slug]/`) | P1 | Articles with categories, author, cover image, related products, `Article` schema. |
| PR-022 | Gift guides | P1 | Curated editorial + shoppable product sets (e.g. gifts for her under ₹999). |
| PR-023 | Style guides | P1 | Intent-led pages (jewellery for saree, for office wear, earrings by face shape) with real guidance plus product modules. |
| PR-024 | 404 / error pages | P0 | Branded, helpful (search, popular categories), returns correct HTTP status. |
| PR-026 | Track order (`/track-order/`) | P0 | Guest lookup by order number + email/phone; shows status timeline and tracking link; rate-limited. |
| PR-027 | Size guide (`/size-guide/` + PDP dialog) | P0 | Ring/bracelet/chain sizing tables with measuring instructions; linked per product. |
| PR-028 | Sibling products ("Also available in") | P0 | Colour/finish siblings shown as swatches on PDP and cards; see ADR-29. |
| PR-025 | Offline/legal utility pages | P0 | `robots.txt`, `sitemap.xml` index, `manifest.webmanifest`, favicons, `humans.txt` optional. |

---

## 2. Product data requirements

Every product supports the fields below (P0 unless noted). Modelled in `05_DATABASE_DESIGN.md`.

| ID | Field group | Fields |
|---|---|---|
| PR-100 | Identity | SKU (unique, per variant), product name, slug (unique, immutable after publish unless redirect created), status (draft/active/archived), publish date. |
| PR-101 | Descriptive | Short description (plain text, ≤ 160 chars, used for cards and meta fallback), long description (rich text/Markdown), highlights (bullet list). |
| PR-102 | Media | Ordered images with alt text, role (primary, gallery, lifestyle, detail), optional product video (self-hosted MP4/WebM or YouTube/Vimeo ID), image per variant. |
| PR-103 | Pricing | Base price (INR, integer paise), compare-at price, sale price with optional schedule (start/end), cost price (admin only, P1). |
| PR-104 | Inventory | Per-variant stock, reserved quantity, low-stock threshold, backorder flag, track-inventory toggle. |
| PR-105 | Taxonomy | Primary category (drives breadcrumb and canonical context), additional categories, collections (manual/rule), tags. |
| PR-106 | Attributes | Gender (women/men/unisex), material, finish/plating, color, occasion (multi), style (multi), closure type, stone type (optional). Controlled vocabularies, filterable, drive SEO landing pages. |
| PR-107 | Physical | Dimensions (length/width/height, mm), weight (g), size info (ring size, chain length). |
| PR-108 | Care & logistics | Care instructions (template or override), shipping class, return eligibility (eligible / exchange-only / final sale) with reason, HSN code, GST rate. |
| PR-109 | SEO | SEO title, SEO description, focus keywords (internal), canonical override (rare), noindex flag, OG image override. |
| PR-110 | Structured data | Auto-generated `Product`/`ProductGroup`, `Offer`, `AggregateRating`, `Review`, `MerchantReturnPolicy`, `OfferShippingDetails` from the data above. No manual JSON entry. |
| PR-111 | Variants | Option types limited to Size and Length; each combination is a variant with its own SKU, price, stock, image. Products without options have a single default variant. Colour/finish are sibling products in a family, not variants (ADR-29). |
| PR-112 | Merchandising | Badges (New, Bestseller, Limited, Back in stock) — computed or manual; featured flag; sort weight. |
| PR-113 | Related products | Manual "complete the look" set + automatic (same category/attributes) fallback. |

---

## 3. Customer features

| ID | Feature | Priority | Requirements |
|---|---|---|---|
| PR-200 | Registration | P0 | Email OTP code (primary) or magic link; Google sign-in; name capture; marketing consent checkbox (unchecked by default). Phone OTP P2. All auth flows server-side (ADR-32). |
| PR-201 | Login | P0 | Same methods; session persists 30 days; secure cookies; logout everywhere (P1). |
| PR-202 | Guest checkout | P0 | No account required; email + phone collected; post-purchase account claim. |
| PR-203 | Wishlist | P0 | Add/remove from card and PDP; guest → account merge; back-in-stock notify (P1). |
| PR-204 | Cart persistence | P0 | Server-side cart keyed by cookie; merged into account cart on login; survives device change for logged-in users; stale-price refresh on load. |
| PR-205 | Order history | P0 | List, detail, invoice PDF (P1), reorder (P1). |
| PR-206 | Address book | P0 | Multiple addresses, default shipping, pincode validation, phone validation (Indian mobile). |
| PR-207 | Reviews & ratings | P1 | Only verified purchasers may review (configurable); one review per product per order; photos; moderation; helpful votes (P2). |
| PR-208 | Coupon codes | P0 | Apply at cart/checkout; validation rules (min order, first order, product/collection scope, usage limits, expiry); stackability rules. |
| PR-209 | Referral system | P2 | Unique referral code/link; referee discount; referrer reward credited after referee's order is delivered and return window passes. |
| PR-210 | Loyalty system | P2 | Points per ₹ spent, tiers, earn/burn ledger, expiry. Architecture built in Phase 1 (ledger tables), UI in Phase 4. |
| PR-211 | Email preferences | P1 | Granular opt-in: new arrivals, offers, journal; one-click unsubscribe; preference centre link in every marketing email. |
| PR-212 | Notifications | P0 | Transactional email for order placed, paid, shipped, delivered, cancelled, refund; password-less login codes. WhatsApp/SMS P2. |
| PR-213 | Account deletion | P1 | Self-service request; data anonymised after retention period (legal/tax records kept). |

---

## 4. Admin requirements

Admin is a protected area of the same application (`/admin`). Role-based access control is specified in `08_ECOMMERCE_REQUIREMENTS.md §9` and `11_SECURITY_REQUIREMENTS.md §4`.

| ID | Module | Priority | Requirements |
|---|---|---|---|
| PR-300 | Products | P0 | CRUD, variants, media upload with reorder and alt text, attribute assignment, pricing schedule, SEO panel with preview, duplicate product, bulk CSV import/export, publish/unpublish, slug change with automatic 301. |
| PR-301 | Categories | P0 | Hierarchy (gender → type), slug, intro content, FAQ, SEO fields, image, sort order, visibility. |
| PR-302 | Collections | P0 | Manual (drag-order) or rule-based (conditions on tags/attributes/price/date/velocity), editorial content, SEO fields. |
| PR-303 | Inventory | P0 | Stock view by variant, adjustments with reason, low-stock list, movement ledger, CSV bulk update. |
| PR-304 | Orders | P0 | List with filters/search, detail with timeline, status transitions, payment status, capture/refund via gateway, create shipment, print invoice/packing slip, add internal notes, cancel, manual order (P1). |
| PR-305 | Customers | P0 | List, search, profile, orders, addresses, notes, consent status, block/unblock. |
| PR-306 | Reviews | P1 | Moderation queue (approve/reject/edit), reply as brand, flag. |
| PR-307 | Coupons & discounts | P0 | Code discounts and automatic discounts; rules builder; usage reports. |
| PR-308 | Homepage content | P0 | Section builder: hero, collection grid, product carousel (by collection), editorial block, journal teasers, testimonial strip. Draft/publish, schedule. |
| PR-309 | Journal | P1 | Markdown editor with image upload, categories, author, SEO, related products, schedule publish. |
| PR-310 | SEO metadata | P0 | Per-entity SEO panel + global defaults (title template, default OG image), bulk noindex, canonical override. |
| PR-311 | Redirects | P0 | 301/302 management, CSV import, auto-created on slug change, hit counter. |
| PR-312 | Navigation | P0 | Header mega-menu, footer menus, mobile menu, with links to categories/collections/pages/external. |
| PR-313 | Banners | P0 | Announcement bar, promotional strips with schedule and placement. Strict limits enforce the "no banner wall" design rule. |
| PR-314 | Gift & style guides | P1 | Guide builder: editorial sections + product modules + FAQ, SEO fields. |
| PR-315 | Pages | P0 | Policy and static pages (rich text) with versions. |
| PR-316 | FAQ | P0 | Groups and items; used on FAQ page and PDP/category FAQ blocks. |
| PR-317 | Analytics dashboard | P1 | Sales, orders, AOV, conversion funnel (from events), top products, low stock, review stats. Links out to GA4/GSC for deep dives. |
| PR-318 | Settings | P0 | Store details, GST, shipping rules, COD rules, payment config state (keys from env, not DB), email templates (P1), feature flags. |
| PR-319 | Audit log | P0 | Every admin mutation recorded (who, what, before/after). |
| PR-320 | Product feed | P1 | Google Merchant Center feed generation and status view. |
| PR-321 | Batch fulfilment | P0 | Multi-order shipment creation, batch labels, packing slips, pick list, courier manifest. |
| PR-322 | Finance | P0 | GST-ready exports (invoices, credit notes, HSN summary); credit notes on every refund/return. P1: Razorpay settlement and COD remittance reconciliation. |
| PR-323 | Search management | P1 | Synonyms, query redirects, zero-result and top-query reports. |
| PR-324 | Order editing | P1 | Address/phone/line swap before processing; monetary changes via cancel-and-recreate. |
| PR-325 | Pincode management | P0 | Override serviceability and COD per pincode. |
| PR-326 | Alerts | P0 | Email alerts for payment review, webhook failures, dead-letter jobs, SLA breaches, low stock. |

---

## 5. Cross-cutting requirements

| ID | Requirement |
|---|---|
| PR-400 | **SEO-first**: SSR/SSG for all indexable pages; dynamic metadata; canonicals; sitemaps; structured data; redirects; faceted navigation control. See `06_SEO_STRATEGY.md`. |
| PR-401 | **Performance**: Core Web Vitals "Good" at p75 mobile; budgets in `12_PERFORMANCE_REQUIREMENTS.md`. |
| PR-402 | **Accessibility**: WCAG 2.2 AA; keyboard operable; focus visible; semantic HTML; alt text enforced in admin. |
| PR-403 | **Security**: see `11_SECURITY_REQUIREMENTS.md`. |
| PR-404 | **Observability**: structured logs, error tracking, uptime checks, analytics events in `10_ANALYTICS_TRACKING.md`. |
| PR-405 | **Localisation-ready**: all currency formatting through one utility (INR, `en-IN`), dates in IST; strings centralised so Hindi or international variants can be added later. Not building i18n routing in v1. |
| PR-406 | **Legal (India)**: Consumer Protection (E-Commerce) Rules 2020 disclosures (seller name, address, grievance officer, return/refund terms, country of origin on PDP), GST-compliant invoices, DPDP Act 2023 consent and data principal rights. |
| PR-407 | **Resilience**: payment webhooks idempotent; order creation transactional; background jobs retried; graceful degradation if search or shipping APIs are down. |

---

## 6. Out of scope for v1 (explicitly)

- Marketplace integrations (syncing stock to Meesho/Myntra) — potential Phase 5.
- Multi-currency / international checkout.
- Subscriptions.
- Live chat beyond a WhatsApp deep link.
- Native apps / PWA install prompts (basic manifest is included).
- AR try-on.
