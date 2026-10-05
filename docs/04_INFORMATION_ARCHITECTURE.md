# 04 — Information Architecture

Site map, URL design, navigation model, page templates and the rules that keep the structure crawlable, usable and premium.

---

## 1. URL design principles

1. **Lowercase, hyphenated, ASCII slugs.** `/women/jewellery-sets/`, never `/Women/Jewellery_Sets`.
2. **Trailing slash on all HTML pages** (`trailingSlash: true` in Next config, enforced with 301). Files (`sitemap.xml`, `robots.txt`, feeds, images) have no trailing slash. *Decision D18 in `01_PROJECT_OVERVIEW.md`.*
3. **One canonical URL per product.** Products live at `/products/{slug}/` regardless of the category they were reached from. Category context is carried by the breadcrumb (from the product's primary category), not the URL. This avoids duplicate content from multi-category products.
4. **Taxonomy URLs are shallow (max 2 levels).** `/women/earrings/`. No `/women/earrings/studs/` in v1; sub-types are facets or collections.
5. **Facets are query parameters** (`?material=gold-plated&color=green`), never path segments, and are non-canonical by default. Intent-worthy combinations get their own **collection** or **style-guide** page with a real slug.
6. **Pagination is a query parameter** `?page=2` with self-referencing canonical.
7. **Sort is a query parameter** and never indexed.
8. **Slugs are immutable after publish.** Changing a slug in admin automatically creates a 301 from the old slug.
9. **No dates in content URLs.** `/journal/how-to-style-a-saree-with-jewellery/`.
10. **Indian English spelling:** *jewellery* throughout URLs and copy.

---

## 2. Site map

### 2.1 Core storefront

```
/                                    Home
/women/                              Women landing
/women/necklaces/                    Category PLP
/women/earrings/
/women/rings/
/women/bracelets/
/women/bangles/
/women/jewellery-sets/
/women/anklets/                      (optional, admin-creatable)
/women/mangalsutras/                 (optional)
/women/maang-tikkas/                 (optional)
/men/                                Men landing
/men/chains/
/men/bracelets/
/men/rings/
/men/pendants/
/men/earrings/                       (optional)
/collections/                        All collections index
/collections/new-arrivals/           Rule-based
/collections/bestsellers/            Rule-based
/collections/wedding-jewellery/      Curated
/collections/party-wear-jewellery/
/collections/daily-wear-jewellery/
/collections/office-wear-jewellery/
/collections/gifting-jewellery/
/collections/anti-tarnish-jewellery/ (material-led, admin-creatable)
/collections/under-999/              (price-led, rule-based)
/products/{slug}/                    Product detail
/search/?q=                          Search results (noindex)
```

### 2.2 Editorial and guidance

```
/journal/                            Journal index
/journal/{slug}/                     Article
/journal/category/{slug}/            Journal category (e.g. styling, care, trends)
/gift-guides/                        Index
/gift-guides/{slug}/                 e.g. gifts-for-her-under-999, anniversary-gifts
/style-guides/                       Index
/style-guides/{slug}/                e.g. jewellery-for-saree, jewellery-for-kurti,
                                     jewellery-for-office-wear, jewellery-for-party-wear,
                                     wedding-guest-jewellery, earrings-for-your-face-shape
/jewellery-care/                     Care guide (evergreen hub)
```

### 2.3 Brand, support, legal

```
/about/                              About Kesa
/contact/
/faq/
/size-guide/                         Ring, bracelet and chain sizing (indexable, useful)
/shipping-policy/
/returns-policy/
/privacy-policy/
/terms/
/grievance-officer/                  (India e-commerce rules disclosure; can live inside /contact/)
```

### 2.4 Commerce (noindex)

```
/track-order/                        Guest order lookup: order number + email/phone
/cart/
/wishlist/
/checkout/
/checkout/confirmation/{orderNumber}/
/login/      /verify/
/account/
/account/orders/     /account/orders/{orderNumber}/
/account/addresses/
/account/wishlist/
/account/reviews/
/account/preferences/
/account/referrals/                  (Phase 4)
/account/rewards/                    (Phase 4)
```

### 2.5 Admin (served only on `admin.{domain}`, auth + RBAC; ADR-31)

```
/admin/                              Dashboard
/admin/products/  /admin/products/new/  /admin/products/{id}/
/admin/categories/   /admin/collections/   /admin/attributes/
/admin/inventory/
/admin/orders/   /admin/orders/{id}/
/admin/customers/   /admin/customers/{id}/
/admin/reviews/
/admin/discounts/
/admin/content/homepage/   /admin/content/banners/   /admin/content/navigation/
/admin/content/pages/   /admin/content/journal/   /admin/content/guides/   /admin/content/faq/
/admin/seo/   /admin/seo/redirects/   /admin/seo/feed/
/admin/search/                       Synonyms, query redirects, zero-result report
/admin/fulfilment/                   Batch labels, manifests, pick lists
/admin/finance/                      GST exports, settlements, COD remittance, credit notes
/admin/settings/   /admin/settings/users/   /admin/settings/shipping/   /admin/settings/payments/   /admin/settings/pincodes/
/admin/audit-log/
```

### 2.6 Machine endpoints

```
/robots.txt
/sitemap.xml                         Index → /sitemap/products.xml, /sitemap/categories.xml, …
/manifest.webmanifest
/api/feeds/google-merchant           (token-protected URL or basic auth for Merchant Center fetch)
/api/webhooks/razorpay   /api/webhooks/shiprocket
/api/jobs/{job}                      (cron only)
/api/search/suggest
```

---

## 3. Taxonomy model

Three distinct organising systems; keeping them separate avoids the "everything is a category" trap.

| System | Purpose | Managed by | URL |
|---|---|---|---|
| **Categories** | The stable "what is it" tree: gender → product type. Each product has one *primary* category (breadcrumb, schema `category`) and may have additional categories. | Admin, rarely changes | `/women/earrings/` |
| **Collections** | Merchandising and intent: occasions, campaigns, price bands, bestsellers. Manual or rule-based. A product can be in many. | Admin, changes often | `/collections/{slug}/` |
| **Attributes** | Controlled vocabularies for facets and specs: material, finish, color, occasion, style, closure, stone. | Admin (values), rarely changes | Query params; may seed collections/style guides |
| **Tags** | Free-form internal labels for rules and search boosting. Never exposed as URLs. | Admin | — |

**Rule:** if a filter combination deserves to rank in Google, it becomes a Collection (with real copy), not an indexed facet URL.

---

## 4. Navigation

### 4.1 Header (desktop ≥ 1024px)

```
[ Kesa ]        Women   Men   Collections   New In   Journal          [Search] [Account] [Wishlist] [Bag 2]
```

- **Women / Men** open a mega-menu: column 1 categories, column 2 "Shop by occasion" (collections), column 3 one editorial image tile (admin-managed).
- **Collections** opens a two-column list of live collections with one image.
- **New In** links to `/collections/new-arrivals/`.
- Announcement bar above header: one line max, admin-scheduled, dismissible, max one active.

### 4.2 Header (mobile)

- Left: hamburger → full-screen sheet with accordion for Women / Men / Collections, then plain links (Journal, Guides, About, Contact).
- Centre: logo.
- Right: search icon, bag icon with count.
- Sticky header shrinks on scroll; no bottom tab bar (keeps the premium feel; the bag/search are always one tap away).
- Sheets, drawers and the lightbox push a history entry so the Android back button closes them instead of leaving the page.

### 4.3 Footer

Four columns on desktop, accordions on mobile:
1. **Shop:** Women, Men, New Arrivals, Bestsellers, Collections, Gift Guides
2. **Help:** Contact, FAQ, Shipping, Returns, Track Order, Jewellery Care
3. **Kesa:** About, Journal, Style Guides, Careers (optional), Grievance Officer
4. **Stay in touch:** newsletter form, Instagram/Pinterest/YouTube icons, WhatsApp

Bottom row: © Kesa Lifestyle, Privacy, Terms, payment method icons (muted, small).

All menus are admin-managed (`navigation_menus`).

### 4.4 Breadcrumbs

Rendered on every page except home and checkout; mirror the primary path:

```
Home › Women › Earrings › Pearl Drop Earrings
Home › Collections › Wedding Jewellery
Home › Journal › How to Style a Saree with Jewellery
Home › Style Guides › Jewellery for Office Wear
```

Emitted as `BreadcrumbList` JSON-LD.

---

## 5. Page templates

| Template | Used by | Server/Client split | Notes |
|---|---|---|---|
| **Home** | `/` | RSC; carousels are CSS scroll-snap (no JS) | Sections from `homepage_sections` |
| **Gender landing** | `/women/`, `/men/` | RSC | Category tiles → collections → product grid (first 12 of new arrivals) → editorial |
| **PLP** | categories, collections, search | RSC grid + client `FilterPanel` (URL-synced) | 24 per page; infinite scroll *not* used (SEO + CWV); "Load more" appends with URL update |
| **PDP** | `/products/{slug}/` | RSC + client gallery, variant selector, add-to-cart | Sticky add-to-cart bar on mobile; "Also available in" sibling swatches (server-rendered links); size guide dialog; tap-to-open lightbox with zoom |
| **Article** | journal, care guide | RSC | Markdown → sanitised HTML; shoppable product modules |
| **Guide** | gift/style guides | RSC | Alternating editorial + product modules + FAQ |
| **Content page** | about, policies, contact, FAQ | RSC | Rich text; FAQ uses accordion with native `<details>` |
| **Auth/Account** | login, account | RSC + client forms | Minimal chrome |
| **Checkout** | `/checkout/` | Client form over server actions | No header nav; trust signals only |
| **Admin** | `/admin/*` | Client data tables + server actions | Dense, functional, separate design tokens |

---

## 6. Search behaviour

- Search box opens a client overlay; suggestions call `/api/search/suggest` (debounced 150ms, min 2 chars) returning products (5), categories (3), collections (3), with the query echoed as "Search for *…*".
- Admin-managed **synonyms** map Indian and Hindi-origin terms to catalogue vocabulary (jhumka → earrings, payal → anklet, kada → bracelet, mangalsutra, haar, nath) and **query redirects** send support-type queries ("return", "track order") to the right page.
- Results page `/search/?q=` is SSR, `noindex, follow`, with the same filter panel as PLP.
- Popular searches (admin-curated) shown when the box is empty.
- Query logging (anonymised) feeds a "zero-result queries" admin report to guide catalogue and redirects.

---

## 7. Redirect and 404 policy

| Case | Behaviour |
|---|---|
| Slug change (product, category, collection, article) | Auto 301 old → new, stored in `redirects` |
| Product out of stock | PDP stays live and indexable (OutOfStock availability, notify-me, alternatives). Never 404 an out-of-stock product. |
| Product archived | Admin must choose at archive time: **301** to a sibling/replacement product or the primary category (default), or **410 Gone** with a branded "no longer available" page. Removed from sitemap immediately. |
| URL depth abuse | `/women/earrings/anything/` (depth > 2) and `?page=0`/non-numeric → 404; `?page=1` → 301 to base |
| Category removed | Admin must choose a redirect target before deletion |
| Legacy marketplace or campaign URLs | Admin-managed 301s with CSV import |
| Unknown URL | 404 with search, popular categories, and recently viewed |
| Non-canonical variants (`/Women/`, missing slash, `index.html`) | 301 to canonical |
| `www` vs apex | 301 to the chosen host (D1) |

---

## 8. Internal linking model

- Every PDP links: primary category, every collection it belongs to, 4–8 related products, one relevant guide/article if tagged.
- Every PLP links: sibling categories, 3 relevant collections, 1–2 guides, FAQ block with links.
- Every article/guide links: ≥ 2 categories/collections, ≥ 4 products via product modules.
- Footer carries the taxonomy spine so every page is ≤ 3 clicks from any category.
- "You may also like" and "Recently viewed" are server-rendered where possible (recently viewed is a client island reading a cookie of IDs).

These rules are enforced by the content model (required related-product fields) rather than by editorial memory.
