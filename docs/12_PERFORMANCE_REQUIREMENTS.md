# 12 — Performance Requirements

Targets, budgets and the techniques that achieve them. Performance is measured on mid-range Android over 4G, because that is the Kesa customer's device.

---

## 1. Targets (field data, p75, mobile)

| Metric | Target | Hard limit (blocks release) |
|---|---|---|
| LCP | ≤ 2.0 s | 2.5 s |
| INP | ≤ 150 ms | 200 ms |
| CLS | ≤ 0.05 | 0.1 |
| TTFB (cached pages) | ≤ 300 ms | 600 ms |
| FCP | ≤ 1.5 s | 1.8 s |
| Lighthouse Performance (mobile, lab) | ≥ 90 on home, PLP, PDP | 85 |

Measured with Vercel Speed Insights (field) and Lighthouse CI (lab, PR previews, throttled "Moto G Power / slow 4G" profile).

---

## 2. Budgets (per route, compressed over the wire)

| Resource | Home | PLP | PDP | Checkout | Admin |
|---|---|---|---|---|---|
| HTML | 60 KB | 80 KB | 80 KB | 40 KB | — |
| JS (initial, excluding framework runtime) | 60 KB | 90 KB | 110 KB | 140 KB | n/a |
| Total JS incl. React/Next runtime | ≤ 170 KB | ≤ 200 KB | ≤ 220 KB | ≤ 250 KB | n/a |
| CSS | 25 KB | 25 KB | 25 KB | 20 KB | — |
| Fonts | 2 families, ≤ 4 files, ≤ 120 KB total | | | | |
| Images above the fold | ≤ 250 KB total; LCP image ≤ 120 KB | | | | |
| Third-party scripts | GA4 only (deferred, consent-gated); Razorpay only on checkout | | | | |
| Requests before LCP | ≤ 15 | | | | |

Budgets enforced by `next build` bundle analysis in CI (`@next/bundle-analyzer` JSON + a size-limit script) and Lighthouse CI assertions.

---

## 3. Rendering and caching

- Static/ISR for every catalogue and content page (`03_TECHNICAL_ARCHITECTURE.md §4`), served from Vercel CDN with `s-maxage` and `stale-while-revalidate`; tag-based revalidation on admin saves keeps content fresh without rebuilds.
- Partial Prerendering: dynamic personal fragments (cart count, wishlist state) stream into a static shell, so TTFB stays CDN-fast.
- Streaming with `Suspense` for below-the-fold data (reviews, related products) on PDP.
- Filtered PLPs: SSR with 60s CDN cache for anonymous traffic; facet counts cached in-process per URL.
- `fetch`/DB reads memoised per request; no duplicate queries in a render tree.
- Functions region `bom1` (Mumbai) near the database; connection pooling to avoid handshake cost.

---

## 4. Images and video

- `next/image` everywhere: responsive `sizes`, AVIF → WebP → JPEG, quality 70–75 for product shots, explicit dimensions (zero CLS).
- LCP image: `priority`, `fetchpriority="high"`, preloaded; hero art-directed per breakpoint so mobile does not download desktop crops.
- Below-the-fold images lazy; product grid images at ≤ 480px width on mobile.
- Blurhash placeholders (tiny inline) rather than grey boxes.
- Video: MP4 (H.264) + WebM, ≤ 2 MB per loop, `preload="none"`, poster image, loaded on intersection only, paused when off-screen; skipped on `saveData`.
- Admin uploads are processed once (resize to max 2400px, strip EXIF, generate blurhash) so originals are never served.
- **Cost control (review finding):** Vercel bills image optimisation per source image transformed and per cache read/write. Thousands of products × several sizes × AVIF/WebP is fine while cached, but churn (re-uploads, many `sizes` breakpoints, long-tail crawler hits) inflates it. Controls: a fixed, small set of device sizes (`deviceSizes: [360, 640, 828, 1080, 1440]`), long `minimumCacheTTL` (30 days; URLs change when assets change), and `/media/` URLs that let us move optimisation to Supabase Image Transformations or a dedicated image CDN later without touching indexed URLs. Image cost is reviewed monthly against the budget.

---

## 5. JavaScript discipline

- Server Components by default; client islands only for listed interactive components (`03 §4`).
- No global state library; no date/utility mega-libraries (use `Intl`, small helpers).
- Dynamic `import()` for: review form, size guide dialog, Razorpay loader, Markdown editor (admin), charts (admin).
- Third-party scripts via `next/script` with `strategy="afterInteractive"` or `lazyOnload`; Razorpay script loaded only when the payment step is reached.
- Avoid layout thrash: filters update URL with `router.replace` + server re-render; no client-side list sorting of large arrays.
- INP: no long tasks > 50 ms on interaction; expensive work (facet recount, search) is server-side; debounce inputs; `startTransition` for navigations.

---

## 6. CSS and fonts

- Tailwind v4 output purged; critical CSS is the whole sheet (≤ 25 KB) loaded once, cached immutably.
- Fonts self-hosted via `next/font` (subset Latin + Latin-ext, variable fonts), `font-display: swap` with `size-adjust` fallbacks to avoid CLS; display font preloaded only on pages that use it above the fold.
- Icons inline SVG (tree-shaken Lucide), no icon font.

---

## 7. Data layer performance

- Indexes listed in `05_DATABASE_DESIGN.md §11`; PLP query must execute < 50 ms at 10k products (verified with `EXPLAIN ANALYZE` in CI seed test).
- Denormalised columns (`rating_avg`, `sales_30d`, `attribute_value_ids[]`, materialised rule collections) avoid heavy joins on hot paths.
- Search suggest endpoint < 100 ms p95; results cached 60s per normalised query.
- Pagination by `LIMIT/OFFSET` to 24 × 50 pages max; beyond that, keyset pagination (not needed for SEO pages).
- Outbox worker batches 50 events per run; email sends parallelised ×5.
- No synchronous DB writes on read paths: analytics buffering, redirect hit counts and search logs are batched or queued; rate-limit counters for anonymous IP limits live in Vercel WAF, not Postgres.

---

## 8. Checkout-specific

- Checkout page ships only the form, validation and payment loader; no header mega-menu or editorial code.
- Pincode lookup from local `pincodes` table (ms) before calling the shipping API; serviceability cached 24h.
- Razorpay checkout opened from a user gesture to avoid popup blockers; script preloaded when the user reaches the payment step.
- Order placement action completes < 800 ms p95 (DB transaction + Razorpay order create).

---

## 9. Monitoring and regression control

- **Lighthouse CI** on every PR for `/`, `/women/earrings/`, a PDP, `/checkout/` (mocked cart) with assertions on the budgets above; failures block merge.
- **Vercel Speed Insights** dashboards reviewed weekly; alert if any route's p75 LCP > 2.5 s for 3 days.
- **Bundle size check** in CI prints deltas per route; > 10 KB growth needs a justification in the PR.
- **Synthetic checks** every 10 minutes on home and a PDP (status + TTFB).
- **Database**: Supabase slow query log reviewed; `pg_stat_statements` top 10 in weekly review.

---

## 10. Degradation strategies

| Dependency down | Behaviour |
|---|---|
| Shipping API | PDP shows generic ETA; checkout allows standard shipping with default rates; serviceability from local table |
| Payment gateway | Clear error with retry; COD offered if eligible; order kept `pending_payment` for retry |
| Email provider | Outbox retries with backoff; admin alert after 15 min of failures |
| Search (DB slow) | Fallback to trigram-only query with lower limit; suggestions disabled |
| Analytics | Never blocks rendering; failures ignored |
| Database | Cached pages continue serving from CDN (stale); dynamic pages show a branded maintenance state with 503 |
