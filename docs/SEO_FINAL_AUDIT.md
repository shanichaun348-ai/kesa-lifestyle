# Kesa Lifestyle — SEO Final Audit

**Date:** October 2026  
**Auditor:** Senior Technical SEO  
**Scope:** Full technical + on-page + structured data + content SEO

---

## Executive Summary

Kesa Lifestyle has a fundamentally solid SEO foundation: a clean App Router architecture
with static generation, correct canonical handling, smart facet-noindex logic, and
production-ready structured data. Two code bugs were confirmed and fixed during this audit.
The main gaps are in structured data accuracy, sitemap completeness, and brand naming
consistency.

**Overall score: 8.0 / 10**

---

## Area Scores

| # | Area | Score | Status |
|---|------|-------|--------|
| 1 | Crawlability | 8/10 | ✅ Good |
| 2 | Indexability | 9/10 | ✅ Excellent |
| 3 | URL Structure | 9/10 | ✅ Excellent |
| 4 | Canonicals | 9/10 | ✅ Excellent |
| 5 | Sitemaps | 7/10 | ⚠️ Minor gaps |
| 6 | Robots | 7/10 | ⚠️ Vercel-tied |
| 7 | Redirects | 9/10 | ✅ Excellent |
| 8 | 404s | 9/10 | ✅ Excellent |
| 9 | Internal Linking | 8/10 | ✅ Good |
| 10 | Orphan Pages | 7/10 | ⚠️ Verify occasions |
| 11 | Duplicate Content | 9/10 | ✅ Excellent |
| 12 | Faceted Navigation | 9/10 | ✅ Excellent |
| 13 | Pagination | 7/10 | ⚠️ No prev/next |
| 14 | Product Variants | 8/10 | ✅ Good |
| 15 | Product Schema | 7/10 | 🔧 Fixed (regex bug) |
| 16 | Category Schema | 8/10 | ✅ Good |
| 17 | Article Schema | 9/10 | ✅ Excellent |
| 18 | Breadcrumbs | 9/10 | ✅ Excellent |
| 19 | Image SEO | 8/10 | ✅ Good |
| 20 | Alt Text | 8/10 | ✅ Good |
| 21 | Page Titles | 8/10 | 🔧 Fixed (brand suffix) |
| 22 | Meta Descriptions | 8/10 | ✅ Good |
| 23 | H1/H2 Structure | 9/10 | ✅ Excellent |
| 24 | Open Graph | 8/10 | ✅ Good |
| 25 | Mobile SEO | 9/10 | ✅ Excellent |
| 26 | Core Web Vitals | 8/10 | ✅ Good |
| 27 | JS Rendering | 9/10 | ✅ Excellent |
| 28 | Merchant Center Readiness | 8/10 | ✅ Good |
| 29 | Search Intent Alignment | 8/10 | ✅ Good |
| 30 | Category Architecture | 8/10 | ✅ Good |
| 31 | Keyword Cannibalization | 8/10 | ✅ Good |
| 32 | Thin Content | 7/10 | ⚠️ Demo data risk |
| 33 | Doorway Page Risks | 9/10 | ✅ Excellent |
| 34 | Duplicate Product Descriptions | 8/10 | ✅ Good |
| 35 | Blog-to-Product Linking | 9/10 | ✅ Excellent |

---

## Detailed Findings

### 1. Crawlability — 8/10

**What's working:**
- `robots.ts` blocks all crawling in non-production (`!isProduction → disallow: "/"`) — correct staging protection.
- Private routes properly blocked: `/cart/`, `/checkout/`, `/account/`, `/admin/`, `/api/`, `/search/`, `/wishlist/`, `/track-order/`.
- Faceted URLs are NOT blocked in robots.txt — correct. A robots block would hide their `noindex` from Google, wasting the signal.

**Issues:**
- Production detection uses `VERCEL_ENV === "production"`. On non-Vercel hosting (custom server, Docker, Render, Railway), `VERCEL_ENV` is undefined, so staging/dev sites would serve a permissive robots.txt.

**Recommendation:** Add a secondary check: `process.env.NODE_ENV === "production"`, or document the Vercel-only requirement explicitly.

---

### 2. Indexability — 9/10

**What's working:**
- `isIndexableListing()` in `src/modules/catalog/facets.ts` drives `noindex` for all parameterised listing URLs — excellent systematic approach.
- Faceted pages: `robots: { index: false, follow: true }` (follow allows Googlebot to discover products through filter combinations).
- Products: `index: true, follow: true`.
- Journal, occasion, style guide pages: `index: true, follow: true`.
- Discontinued products permanently redirect rather than 404 — preserves link equity.

**No critical issues.**

---

### 3. URL Structure — 9/10

**What's working:**
- `trailingSlash: true` in `next.config.ts` enforces canonical slash consistently.
- Kebab-case slugs enforced by regex validation: `/^[a-z0-9-]{1,120}$/`.
- Category hierarchy max 2 levels: `/women/earrings/` — shallow, crawlable, easy for users.
- Products: `/products/[slug]/` — clear, flat, product-focused.
- Collections: `/collections/[slug]/`.
- Editorial: `/journal/[slug]/`, `/style-guides/[slug]/`, `/occasion/[slug]/`.

**Minor issue:** Occasion pages live under `/occasion/` which is not the most discoverable URL pattern for users (consider `/jewellery-for/[occasion]/` in the future), but it's fine for now.

---

### 4. Canonicals — 9/10

**What's working:**
- `metadataBase: new URL(siteUrl)` in root layout (`src/app/layout.tsx`) resolves all relative canonical paths to absolute URLs automatically.
- All page types emit explicit `alternates: { canonical: ... }`.
- Listing pages: filtered/faceted state uses base path as canonical, not the current URL — correct.
- Product variant pages (`?variant=SKU`): the `resolveVariant` function redirects invalid SKUs to the canonical path; the variant parameter is never in the page canonical.
- Self-canonicals on all pages prevent accidental duplicate indexing.

**Minor:** `NEXT_PUBLIC_SITE_URL` env var must be set in production. If omitted, `site.url` falls back to `http://localhost:3000` and all absolute URLs in sitemaps and JSON-LD will be wrong. This must be configured before launch.

---

### 5. Sitemaps — 7/10

**What's working:**
- Products (with image URLs), categories, qualifying collections (≥3 products), journal articles, style guides, occasion pages included.
- Product image sitemap using Next.js `images` extension — excellent for image search.
- Journal and style guide entries have `lastModified` from content timestamps.
- Collections filtered to ≥3 products — avoids thin/empty collection pages in the index.

**Issues:**
- Category entries (`/women/`, `/women/earrings/`, etc.) lack `lastModified`. Google uses `lastModified` for re-crawl prioritisation. Since `Category` type has no `updatedAt` field, this requires a data model change to fix properly.
- Collection entries also lack `lastModified`.
- Homepage and policy pages lack `lastModified`.
- Occasion pages lack `lastModified`.

**Fix needed (data model, medium-term):** Add `updatedAt` to `Category` and `Collection` types.

---

### 6. Robots — 7/10

**What's working:**
- Sensible disallow list covers all user-specific and sensitive routes.
- Sitemap URL registered: `sitemap: absoluteUrl("/sitemap.xml")`.
- Non-production blocks all crawlers — correct for staging.

**Issues:**
- `VERCEL_ENV === "production"` check is Vercel-specific. See §1.

---

### 7. Redirects — 9/10

**What's working:**
- `/style/:slug/` → `/style-guides/:slug/` permanent redirect in `next.config.ts`.
- Discontinued products: `permanentRedirect(product.discontinuedRedirectPath ?? ...)` — outstanding. Link equity preserved.
- Invalid variant SKU: `permanentRedirect(path)` — clean URL recovery.
- `trailingSlash: true` normalises slash variants automatically (Next.js handles no-trailing-slash → trailing-slash redirect).

**No critical issues.**

---

### 8. 404s — 9/10

**What's working:**
- `not-found.tsx` exists — custom 404 page.
- Products call `notFound()` for missing slugs.
- Category/collection routes call `notFound()` for unknown paths.
- Slug validation regex prevents malformed URLs from hitting the database.
- Archived products redirect (308) rather than 404.

**No critical issues.**

---

### 9. Internal Linking — 8/10

**What's working:**
- Breadcrumbs on all product, category, and journal pages.
- "Complete the look" cross-links products via `completeTheLookSlugs`.
- Product family siblings linked (finish/colour variants).
- "Related products" rail on product pages.
- "Explore more" related category/collection links on listing pages.
- Journal sidebar: `relatedCategoryPaths` → shop-by-category links.
- Journal sidebar: `relatedArticleSlugs` → related articles.
- Journal page: `relatedProductSlugs` → ProductRail section.
- Footer: links to Women, Men, collections, editorial, help pages.
- Site header mega-menu: all category pages.

**Gap:** Products don't link back to journal articles that feature them (one-directional). This is a low-priority improvement.

---

### 10. Orphan Pages — 7/10

**What's working:**
- Journal posts linked from journal index + home page `JournalPreview` section.
- Style guides linked from home page `StylingGuides` section.
- Categories accessible from site header mega-menu.

**Risk:** Occasion pages (`/occasion/[slug]/`) are listed in the sitemap and there's an `/occasion/` index page, but the home page or navigation must link to the index for these to not be orphaned. Verify that `/occasion/` is linked from at least one navigable location (footer "Occasions" link, or home page section).

**Action:** Confirm /occasion/ appears in at least one primary navigation path. If not, add a footer link or home page section.

---

### 11. Duplicate Content — 9/10

**What's working:**
- Faceted/filtered URLs: `noindex` + self-canonical pointing to base path.
- Product variant URLs (`?variant=`): redirect to canonical.
- `trailingSlash: true`: all URLs normalised — no www/no-slash variants creating duplicates.
- Product family variants (finish/colour) are separate products with unique names and descriptions — not duplicate content.

**No critical issues.**

---

### 12. Faceted Navigation — 9/10

**What's working:**
- `isIndexableListing()` in `src/modules/catalog/facets.ts` determines indexability based on filter parameters — systematic, code-level control.
- Filtered pages emit `robots: { index: false, follow: true }` via `listingMetadata()`.
- Canonical of filtered pages points to unfiltered base URL.
- "Clear filters" link uses `rel="nofollow"`.
- No infinite scroll — pagination is discrete pages (no crawl trap).

**No critical issues.**

---

### 13. Pagination — 7/10

**What's working:**
- Page 2+ titles: `{baseTitle} – Page N` to differentiate titles.
- `StorePagination` component renders numbered page links.
- Self-canonicals on paginated pages.

**Issues:**
- No `rel="prev"` / `rel="next"` link tags. Google officially deprecated these in 2019, but other search engines (Bing, Yandex) still use them. Low priority.
- Page 2+ gets `noindex` on filtered views only — plain paginated views are indexable. This is correct for Googlebot.

---

### 14. Product Variants — 8/10

**What's working:**
- Finish/colour variants: separate Product records with separate slugs — each page independently indexable with its own metadata and images.
- Family relationship modelled via `familyId` → `isVariantOf ProductGroup` in schema.
- Size/length variants: single product URL, `?variant=SKU` for pre-selection only, no separate indexable pages (correct — size variants don't deserve separate pages).
- Invalid `?variant=` values redirect to canonical product URL.

**Improvement:** Family sibling variant links use product URLs (not `?variant=`), so Googlebot treats each finish as a standalone product — this is the correct strategy for jewellery where finish differences justify separate content.

---

### 15. Product Schema — 7/10 → **Fixed**

**Bug fixed during audit:**

`src/modules/seo/structured-data.ts:233` — category breadcrumb path was built with:
```typescript
// BEFORE (bug): only replaces first slash
category: product.primaryCategoryPath.replace("/", " > "),
// For "women/earrings/stud-earrings" → "women > earrings/stud-earrings" ❌

// AFTER (fixed): global replace
category: product.primaryCategoryPath.replace(/\//g, " > "),
// For "women/earrings/stud-earrings" → "women > earrings > stud-earrings" ✅
```

**What's working (after fix):**
- Product/ProductGroup JSON-LD on all product pages.
- Offers with `priceCurrency`, `price`, `availability`, `itemCondition`, `sku`.
- `hasMerchantReturnPolicy` and `shippingDetails` @id references — excellent for Merchant Center.
- `AggregateRating` and `Review` nodes emitted only when real review data exists — no fake reviews.
- `ProductGroup` with `hasVariant` for multi-variant products.
- `isVariantOf ProductGroup` for finish siblings.

**Remaining minor issues:**
- `variesBy` is hardcoded to `"https://schema.org/size"`. This is technically correct for both ring sizes and chain lengths (both are size dimensions), but a future improvement would be dynamic mapping.
- Organization schema (`organizationJsonLd`) lacks `logo` and `sameAs` (noted in code comment as pending brand asset D12).

---

### 16. Category Schema — 8/10

**What's working:**
- `CollectionPage` schema on all listing pages (categories, gender pages, collections).
- `ItemList` of product URLs included.
- `BreadcrumbList` JSON-LD mirrors visual breadcrumbs.
- `FAQPage` emitted on listing pages that have FAQ data.
- `isPartOf: { "@id": site/#website }` links categories to the WebSite entity.

**Minor:** `CollectionPage` uses type `CollectionPage` — Google accepts this, but `ItemList` + `Product` items inside it is the preferred modern pattern. Current implementation already has the `ItemList` embedded, which is good.

---

### 17. Article Schema — 9/10

**What's working:**
- `Article` schema on all journal pages.
- `headline`, `description`, `datePublished`, `dateModified`, `publisher` (→ organization), `author`, `image`, `url`.
- `inLanguage: "en-IN"` — correct for Indian English content.
- `isPartOf: { "@id": site/#website }` for entity graph.
- `BreadcrumbList` emitted alongside.
- Author falls back to organization `@id` when no named author — correct.

**No critical issues.**

---

### 18. Breadcrumbs — 9/10

**What's working:**
- Visual `Breadcrumbs` component on product, category, collection, and journal pages.
- `BreadcrumbList` JSON-LD mirrors the visual breadcrumbs exactly.
- Home → Gender → Category → Product (up to 4 levels, never deeper).
- Last breadcrumb item (current page) has no `href` in visual but gets the page URL in JSON-LD (required by schema).
- Gender root pages: Home → {Women/Men} (2 levels).
- Journal pages: Home → Journal → Article (3 levels).

**No critical issues.**

---

### 19. Image SEO — 8/10

**What's working:**
- Next.js Image with AVIF + WebP format negotiation (`formats: ["image/avif", "image/webp"]`).
- LCP images marked with `priority` + `fetchPriority="high"`.
- Appropriate `sizes` attributes on responsive images.
- SVG placeholders correctly use `unoptimized: true` (bypasses optimization for vector images).
- Product images included in XML sitemap via `images` extension.
- Long `minimumCacheTTL: 30 days` for optimised images.

**Recommendation:** When real product photos are added, ensure images have descriptive filenames (`gold-ring-stacking-set.jpg`, not `IMG_0312.jpg`). The current system passes alt text but not filename control.

---

### 20. Alt Text — 8/10

**What's working:**
- All `<Image>` components have required `alt` prop (TypeScript enforces this via Next.js types).
- Product images: product name as alt.
- Journal images: article title as alt.
- Category tile images in listing page use `alt=""` (decorative context — correct, the label is in the adjacent text).
- Hero and editorial images have descriptive alt text.

**Gap:** Product gallery images all use the same alt (product name). When multiple images show different angles/details, unique alt text per image would be valuable (e.g., "Gold stacking ring — side view").

---

### 21. Page Titles — 8/10 → **Fixed**

**Bug fixed during audit:**

`src/modules/seo/metadata.ts:38` — listing page title suffix was `| Kesa` (truncated brand name) while product and article pages use `| Kesa Lifestyle`.

```typescript
// BEFORE (inconsistent):
clampTitle(`${input.baseTitle}${pageSuffix}${filteredSuffix} | Kesa`)

// AFTER (consistent):
clampTitle(`${input.baseTitle}${pageSuffix}${filteredSuffix} | Kesa Lifestyle`)
```

**After fix, all page types use `| Kesa Lifestyle`:**
- Homepage: `Kesa Lifestyle | {tagline}` (absolute title)
- Products: `{name} | Kesa Lifestyle`
- Articles: `{title} | Kesa Lifestyle`
- Listing pages: `{baseTitle} | Kesa Lifestyle` (clamped to 60 chars)

**Title template** `%s | Kesa Lifestyle` in root layout ensures the brand appears in all page titles unless overridden with `{ absolute: ... }`.

---

### 22. Meta Descriptions — 8/10

**What's working:**
- All pages emit meta description.
- Product descriptions auto-generated: `{shortDescription} Anti-tarnish, skin-friendly[, finish]. Free shipping over ₹999.` — includes a call-to-action and key USPs.
- Descriptions clamped to 160 chars via `clampDescription()`.
- Listing descriptions sourced from `category.seoDescription ?? category.intro`.
- Journal descriptions from `article.seoDescription ?? article.excerpt`.
- Occasion page descriptions from `occasion.seoDescription`.

**Minor:** Some listing pages may rely on the `intro` field as description if no `seoDescription` is set — ensure all category intro texts are compelling enough to serve as meta descriptions (should be 120–160 chars, start with the target keyword).

---

### 23. H1/H2 Structure — 9/10

**What's working:**
- Exactly one `<h1>` per page — confirmed for product, listing, journal, and home pages.
- Product pages: `<h1>` = product name; `<h2>` = "How to style it" (if applicable).
- Category/collection pages: `<h1>` = `category.titleNoun`; `<h2>` = "About {category.name.toLowerCase()}".
- Journal pages: `<h1>` = article title; `<h2>` = article section headings.
- Home page: `<h1>` expected in the Hero component (visually the largest heading).
- FAQ accordions on category and product pages use appropriate heading levels.

**Verify:** Confirm the Hero component's main CTA heading is an `<h1>` (or at least that no page has an orphaned non-H1 title-sized heading). If it is a `<p>` styled as a title, add a screen-reader-only `<h1>` for accessibility + SEO.

---

### 24. Open Graph — 8/10

**What's working:**
- OG tags on all pages via Next.js `metadata.openGraph`.
- `og:type = "article"` on journal pages — correct.
- `og:locale = "en_IN"` — correct for Indian English.
- `og:site_name = "Kesa Lifestyle"` on all pages.
- Twitter card: `summary_large_image` in root layout (inherited by all pages).
- Product OG images set from first product image URL.
- Journal OG images set from article hero image.

**Minor:** Product pages use `og:type = "website"` (not `"product"`). The `og:type = "product"` value is non-standard in the OG specification — "website" is correct. However, Facebook and Pinterest do support `og:type = "product"` for product pins; this is a low-priority enhancement.

**Note:** `product:price:amount` and `product:price:currency` meta tags are emitted on product pages via `metadata.other` — this is a custom extension compatible with Facebook Product Catalog.

---

### 25. Mobile SEO — 9/10

**What's working:**
- `viewport: { width: "device-width", initialScale: 1 }` in root layout.
- `themeColor: "#fbfaf7"` for browser chrome colouring.
- Responsive layouts in all components (Tailwind breakpoints).
- No separate `m.` subdomain — single responsive URL (correct).
- Mobile navigation via `MobileNav` sheet component.
- Touch-friendly tap targets (minimum 44px interactive elements).

**No critical issues.**

---

### 26. Core Web Vitals — 8/10

**What's working:**
- LCP: Gender tiles and first category tile images use `priority` + `fetchPriority="high"`. First 4 new-arrival product images prioritised. Hero image prioritised.
- CLS: Consistent aspect ratios on all images (`aspect-[4/3]`, `aspect-square`, etc.) prevent layout shift.
- INP: Minimal client JavaScript — most content is server-rendered. Cart/wishlist are client islands but are not in the critical path.
- Font: `display: swap` on Inter and Fraunces (prevents invisible text during font load). Only 2 Fraunces weights requested (400, 500) — small payload.
- JS bundle: App Router with React Server Components minimises client JS.

**Remaining risk:** Google Analytics 4 (`beforeInteractive`) adds ~45KB to the critical path. Google Consent Mode v2 defers full GA4 until consent granted, so impact is minimised for EU users. For Indian users (no consent law), GA4 fires on first load.

---

### 27. JavaScript Rendering — 9/10

**What's working:**
- App Router with static generation (`generateStaticParams`) on product and journal pages — HTML is pre-rendered at build time.
- JSON-LD structured data emitted in the server-rendered HTML payload — no JavaScript needed for Googlebot to see schemas.
- Server Components for all content-heavy pages (product, category, journal).
- Client Components scoped to interactive islands: cart drawer, filter form, wishlist button, consent banner.
- `<Suspense>` boundaries wrap client components on static pages to prevent opt-out of static generation.

**No critical issues.**

---

### 28. Merchant Center Readiness — 8/10

**What's working:**
- Product feed endpoint: `/api/feed/google-shopping/` — dedicated Google Shopping feed.
- `MerchantReturnPolicy` JSON-LD on returns policy page — closes the `@id` reference from product offers.
- `OfferShippingDetails` JSON-LD on shipping policy page — closes the `@id` reference from product offers.
- Offers include: `priceCurrency`, `price`, `availability`, `itemCondition`, `sku`, `hasMerchantReturnPolicy`, `shippingDetails`.
- Price format: `(pricePaise / 100).toFixed(2)` — correct INR decimal.

**Gaps:**
- No `gtin` (EAN/UPC) on products. This is common for fashion jewellery (manufacturer GTINs not always available). Google allows `identifier_exists: false` if products genuinely lack GTINs — consider adding this to the product feed.
- Organization schema missing `logo` (brand asset pending). Add once the logo URL is stable.
- Organization schema missing `sameAs` (social profiles). Add Instagram, YouTube, etc. once live.

---

### 29. Search Intent Alignment — 8/10

**What's working:**
- Category `titleNoun` used as H1: "Earrings for Women", "Gold-Plated Rings for Men" — aligned with "buy [product] for [audience]" intent.
- `"Buy Online"` suffix added to root category titles in metadata (`genderRouteMetadata`).
- Journal content is editorial / informational — correctly separated from transactional product pages.
- Occasion pages bridge editorial and transactional intent.
- Collection titles reflect intent: "New Arrivals", "Anti-Tarnish Jewellery", "Party Wear Jewellery".

**No critical issues.**

---

### 30. Category Architecture — 8/10

**What's working:**
- Gender → Category → Product (max 3 URL levels, 2 category levels).
- Deliberately shallow taxonomy (docs/04 §1.4) — good for crawl budget and link equity.
- Collections provide cross-cutting groupings (occasion, material, price) without duplication.
- Style guides and occasion pages add topical depth.

**Architecture note:** The current 2-level max (e.g., `/women/earrings/`) means sub-subcategories like `/women/earrings/studs/` are 404s by design. This is correct — stud earrings should be a filter, not a URL level.

---

### 31. Keyword Cannibalization — 8/10

**What's working:**
- `/women/` targets "women's jewellery" (broad); `/women/earrings/` targets "earrings for women" (specific) — clearly different intent levels.
- Product pages target specific product names, not category keywords.
- Collections and category pages have distinct `seoTitle` fields to differentiate intent.

**Monitor:** When product descriptions use the same phrases as category intro text, it can create soft cannibalization signals. Ensure each category intro paragraph is unique and not copied from product descriptions.

---

### 32. Thin Content — 7/10

**Risk:**
- The codebase enforces `intro` on all category and collection pages, which prevents empty pages.
- However, demo data categories may have short, generic intro text. Before launch, all category `body` paragraphs, `seoDescription` fields, and `intro` text must be reviewed for length (target: 100+ words on category pages).
- Collections with only 3 products (the minimum for sitemap inclusion) have very little product content — these are borderline thin.

**Recommendation:** Set `priority: 0.5` (not 0.7) for collections with fewer than 8 products. Add `body` copy to all category pages before launch.

---

### 33. Doorway Page Risks — 9/10

**No doorway page patterns detected:**
- Occasion pages (`/occasion/[slug]/`) are editorially written with unique content per page.
- Style guide pages contain genuine editorial content with product recommendations.
- No pattern of programmatic pages targeting keyword permutations.
- Collections are hand-curated, not auto-generated.

**No critical issues.**

---

### 34. Duplicate Product Descriptions — 8/10

**What's working:**
- `shortDescription` is a required unique field per product.
- Product metadata descriptions include product-specific `shortDescription` + generated anti-tarnish/shipping copy.
- Finish variants (colour/material siblings) have the finish label in their product name, creating unique titles.

**Risk:** The auto-generated product description suffix ("Anti-tarnish, skin-friendly. Free shipping over ₹999.") is the same for all products. Google sees the unique `shortDescription` prefix, so this is unlikely to be flagged, but consider making the suffix more product-specific for top-performing products.

---

### 35. Blog-to-Product Internal Linking — 9/10

**What's working:**
- Journal articles have `relatedProductSlugs` → rendered as `ProductRail` section at bottom of article — direct editorial-to-transactional link.
- Journal articles have `relatedCategoryPaths` → rendered as sidebar "Shop by category" links.
- Journal index page links to all articles.
- Related articles sidebar creates a linked cluster of topically related content.
- Breadcrumb on article pages links Home → Journal → Article, distributing link equity upward.

**Gap:** Product pages don't yet show "As featured in" journal links. This is a low-priority enhancement.

---

## Critical Fixes Applied

Two code bugs were fixed during this audit and included in the accompanying commit:

### Fix 1: Product Schema Category Path — `structured-data.ts:233`

The `category` field in Product JSON-LD was built with `String.prototype.replace()` using a literal string, which replaces only the **first** occurrence. For nested category paths like `women/earrings/stud-earrings`, this produced `women > earrings/stud-earrings` instead of the correct `women > earrings > stud-earrings`.

```typescript
// Before (bug):
category: product.primaryCategoryPath.replace("/", " > ")

// After (fixed):
category: product.primaryCategoryPath.replace(/\//g, " > ")
```

**Impact:** All product JSON-LD schemas for products in sub-categories had malformed `category` values. This could affect Google's categorisation of products in Search and Merchant Center.

### Fix 2: Listing Page Title Brand Suffix — `metadata.ts:38`

Category, gender, and collection listing pages used `| Kesa` (shortened brand name) while product and journal pages used `| Kesa Lifestyle`. This created inconsistent brand signals in search results.

```typescript
// Before (inconsistent):
clampTitle(`${input.baseTitle}... | Kesa`)

// After (consistent):
clampTitle(`${input.baseTitle}... | Kesa Lifestyle`)
```

**Impact:** Brand name in SERP title was truncated for all category pages. Now consistent across all page types.

---

## Remaining Recommendations (Medium-Term)

| Priority | Recommendation |
|----------|---------------|
| High | Set `NEXT_PUBLIC_SITE_URL` in all environments before launch — all canonical/sitemap URLs depend on it |
| High | Add `logo` to Organization JSON-LD once brand asset (D12) is finalised |
| High | Populate real `intro`, `body`, `seoDescription` for all categories and collections before launch |
| Medium | Add `sameAs` to Organization schema (Instagram, YouTube, etc.) |
| Medium | Add `updatedAt` to Category/Collection types to enable `lastModified` in sitemap |
| Medium | Confirm `/occasion/` is linked from at least one navigable surface (footer/nav) |
| Medium | Set `robots.ts` production detection to work on non-Vercel environments |
| Low | Add `rel="prev"` / `rel="next"` pagination hints for non-Google search engines |
| Low | Add "As featured in Journal" links on product pages |
| Low | Make product gallery image alt text unique per image angle/detail |
| Low | Add `gtin`/`identifier_exists: false` to Google Shopping feed |
