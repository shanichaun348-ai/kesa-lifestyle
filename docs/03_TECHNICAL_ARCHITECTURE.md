# 03 — Technical Architecture

This document defines the stack, project structure, rendering model, data flow and integration boundaries. Every major choice is cross-referenced to `00_ARCHITECTURE_DECISION_RECORD.md` (ADR-xx).

---

## 1. Proposed stack

| Layer | Choice | ADR | One-line reason |
|---|---|---|---|
| Language | TypeScript (strict) | ADR-01 | Shared types across DB, server, UI; catches whole classes of bugs. |
| Framework | Next.js 16 (App Router, React Server Components, Cache Components/PPR) | ADR-02 | Best-in-class SSR/SSG/ISR + streaming for SEO and performance with one codebase for storefront and admin. |
| Styling | Tailwind CSS v4 + CSS variables design tokens | ADR-03 | Fast, consistent, tiny CSS output, pairs with a strict token system. |
| UI primitives | Radix UI primitives via shadcn/ui (copied into repo, not a dependency) | ADR-03 | Accessible dialogs, menus, accordions without owning the a11y edge cases. |
| Database | PostgreSQL 16 on Supabase (Mumbai, `ap-south-1`) | ADR-04 | Relational integrity for commerce; FTS and trigram search built in; managed backups. |
| ORM / migrations | Drizzle ORM + drizzle-kit SQL migrations | ADR-05 | Thin, SQL-first, fully typed, no runtime codegen step. |
| Auth | Supabase Auth (email OTP code primary, magic link, Google; phone OTP later), server-only flows, `HttpOnly` cookies | ADR-06, ADR-32 | Managed, India-friendly, integrates with Postgres RLS. |
| File storage | Supabase Storage (product media, review photos, invoices), exposed at `/media/*` on our domain | ADR-07, ADR-30 | Same vendor, signed uploads, policy-based access. Stable first-party image URLs; served through `next/image` for optimisation. |
| Image optimisation | `next/image` (AVIF/WebP, responsive) | ADR-07 | Zero-config responsive formats; CDN-cached. |
| Hosting | Vercel (Fluid Compute, Node.js runtime) | ADR-08 | Native Next.js support, global CDN, ISR, cron, previews. |
| Payments | Razorpay (Standard Checkout + Orders API + Webhooks) | ADR-09 | Dominant Indian gateway: UPI, cards, netbanking, wallets, EMI. |
| Shipping | Shiprocket API behind a `ShippingProvider` interface | ADR-10 | Multi-courier aggregator with serviceability, rate, AWB, tracking. |
| Search | Postgres full-text (`tsvector`) + `pg_trgm` for typo tolerance | ADR-11 | Enough for thousands of SKUs; no extra service. Interface allows Meilisearch later. |
| Email | Resend + React Email templates | ADR-12 | Reliable transactional email with typed, previewable templates. |
| Background jobs | Vercel Cron + Postgres outbox table (polling worker route) | ADR-13 | Reliable side-effects (emails, feed rebuilds, stock release) without a queue service. Upgrade path: Vercel Queues. |
| Validation | Zod (shared schemas for forms, server actions, API, env) | ADR-14 | One schema → types + runtime validation. |
| Analytics | GA4 (gtag, consent-gated) + Vercel Analytics & Speed Insights; server-side event bridge | ADR-15 | Required for GSC/Merchant/Ads; minimal client JS. |
| Error tracking | Sentry (server + client, sampled) | ADR-16 | Source-mapped errors, performance traces. |
| Logging | `pino` structured JSON logs → Vercel logs / Log Drain | ADR-16 | Queryable, correlated by request ID. |
| Testing | Vitest (unit/integration), Testing Library, Playwright (e2e), `pgTAP`-style SQL tests optional | ADR-17 | Fast unit loop; real browser e2e for checkout. |
| Lint/format | ESLint (next, typescript-eslint, jsx-a11y) + Prettier | ADR-17 | Consistency and accessibility lint at commit time. |
| Package manager | pnpm | ADR-18 | Fast, strict dependency resolution (already installed locally). |
| CI | GitHub Actions (typecheck, lint, test, build) + Vercel preview deployments | ADR-18 | Every PR gets a preview URL and green checks. |

### Explicitly not used (and why)

- **Shopify / headless commerce SaaS** — monthly fees + transaction fees, limited control over SEO URL structure and data model, Indian payments via third-party apps. We want full ownership. (ADR-02)
- **Medusa / Saleor / Vendure** — capable, but each brings a large runtime, its own admin and plugin ecosystem to learn, and would still need custom SEO/content work. Overkill for a single-brand store. (ADR-02)
- **Payload / Sanity / Strapi CMS** — content needs are structured and modest; an in-app admin on the same Postgres avoids a second data store and sync problems. (ADR-19)
- **Redux / Zustand / global client state** — cart and wishlist are server state; React Server Components + small client islands remove the need. (ADR-20)
- **GraphQL** — single consumer (our own UI); Server Components call typed query functions directly. (ADR-20)
- **Prisma** — heavier runtime, slower cold starts, less SQL control than Drizzle. (ADR-05)
- **Edge runtime** — deprecated on Vercel; Node.js on Fluid Compute is the default. (ADR-08)

---

## 2. High-level architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Users (mobile-first)                       │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTPS
┌───────────────▼──────────────────────────────────────────────────────┐
│  Vercel CDN  (static assets, ISR pages, image optimisation cache)    │
└───────────────┬──────────────────────────────────────────────────────┘
                │ miss / dynamic
┌───────────────▼──────────────────────────────────────────────────────┐
│  Next.js 16 app (Node.js, Fluid Compute)                             │
│  ┌───────────────────┐ ┌───────────────┐ ┌─────────────────────────┐ │
│  │ (storefront)      │ │ (account)     │ │ (admin)                 │ │
│  │ RSC pages, SSG/ISR│ │ dynamic, auth │ │ dynamic, RBAC           │ │
│  └─────────┬─────────┘ └───────┬───────┘ └───────────┬─────────────┘ │
│            │  Server Actions / Route Handlers         │               │
│  ┌─────────▼─────────────────────────────────────────▼─────────────┐ │
│  │ modules/* (domain services: catalog, cart, checkout, orders,    │ │
│  │   customers, reviews, discounts, content, seo, search, loyalty) │ │
│  └─────────┬───────────────┬──────────────┬──────────────┬─────────┘ │
│            │ Drizzle       │ providers    │ outbox       │ cache     │
└────────────┼───────────────┼──────────────┼──────────────┼───────────┘
             │               │              │              │
   ┌─────────▼────────┐ ┌────▼─────────┐ ┌──▼──────────┐ ┌─▼──────────┐
   │ Supabase Postgres│ │ Razorpay     │ │ Vercel Cron │ │ Next cache │
   │ + Auth + Storage │ │ Shiprocket   │ │ → /api/jobs │ │ (tags)     │
   │ (RLS enabled)    │ │ Resend       │ │             │ │            │
   └──────────────────┘ │ GA4 / Sentry │ └─────────────┘ └────────────┘
                        └──────────────┘
```

**Key property:** the Next.js server is the *only* writer to the database and the only holder of secrets. Browsers never talk to Supabase directly, not even for auth: OTP, OAuth code exchange and sign-out run through Server Actions and route handlers, so there is no Supabase browser client in the bundle and session cookies stay `HttpOnly` (ADR-32).

---

## 3. Project structure (single app, pnpm)

```
kesa-lifestyle/
├── docs/                          # this document set
├── public/                        # static assets (fonts self-hosted, icons, og-default.jpg)
├── src/
│   ├── app/
│   │   ├── (storefront)/          # public, SEO-critical routes
│   │   │   ├── layout.tsx         # header/footer, announcement bar
│   │   │   ├── page.tsx           # /
│   │   │   ├── women/[[...category]]/page.tsx     # /women/, /women/earrings/
│   │   │   ├── men/[[...category]]/page.tsx       # /men/, /men/chains/
│   │   │   ├── collections/[slug]/page.tsx
│   │   │   ├── products/[slug]/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── journal/{page.tsx,[slug]/page.tsx,category/[slug]/page.tsx}
│   │   │   ├── gift-guides/{page.tsx,[slug]/page.tsx}
│   │   │   ├── style-guides/{page.tsx,[slug]/page.tsx}
│   │   │   ├── [pageSlug]/page.tsx                # root-level content pages: /about/, /returns-policy/, /jewellery-care/ (slug validated against `pages`, reserved slugs rejected; static routes win over this dynamic one)
│   │   │   ├── faq/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── size-guide/page.tsx
│   │   │   ├── track-order/page.tsx               # guest order lookup (rate-limited)
│   │   │   ├── cart/page.tsx
│   │   │   ├── wishlist/page.tsx
│   │   │   └── not-found.tsx
│   │   ├── (checkout)/            # minimal layout, no header nav distractions
│   │   │   ├── checkout/page.tsx
│   │   │   └── checkout/confirmation/[orderNumber]/page.tsx
│   │   ├── (account)/account/...  # orders, addresses, wishlist, reviews, preferences
│   │   ├── (auth)/{login,verify}/page.tsx
│   │   ├── (admin)/admin/...      # products, orders, customers, content, settings…
│   │   ├── (admin)/ is served only on admin.{domain} via host-based rewrite in proxy.ts (ADR-31)
│   │   ├── media/[...path]/route.ts       # /media/* → storage object (ADR-30); long-lived cache headers
│   │   ├── api/
│   │   │   ├── webhooks/razorpay/route.ts
│   │   │   ├── webhooks/shiprocket/route.ts
│   │   │   ├── jobs/[job]/route.ts        # cron-invoked, bearer-protected
│   │   │   ├── feeds/google-merchant/route.ts
│   │   │   ├── orders/[orderNumber]/status/route.ts  # confirmation-page polling while webhook settles
│   │   │   └── search/suggest/route.ts
│   │   ├── sitemap.ts, sitemap/[id]/sitemap.ts, robots.ts, manifest.ts
│   │   ├── opengraph-image.tsx    # default OG image generator
│   │   └── global-error.tsx
│   ├── modules/                   # domain logic (server-only unless noted)
│   │   ├── catalog/   {queries.ts, actions.ts, schemas.ts, types.ts, seo.ts}
│   │   ├── search/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── payments/  {razorpay.ts, provider.ts}
│   │   ├── shipping/  {shiprocket.ts, provider.ts, pincodes.ts}
│   │   ├── customers/
│   │   ├── reviews/
│   │   ├── discounts/
│   │   ├── loyalty/
│   │   ├── content/   {pages, journal, guides, homepage, navigation, banners}
│   │   ├── seo/       {metadata.ts, structured-data.ts, redirects.ts, sitemaps.ts}
│   │   ├── notifications/ {email templates, outbox handlers}
│   │   └── admin/     {audit.ts, rbac.ts}
│   ├── components/
│   │   ├── ui/                    # shadcn-derived primitives (Button, Dialog, Sheet…)
│   │   ├── storefront/            # ProductCard, ProductGallery, FilterPanel, CartDrawer…
│   │   ├── admin/                 # DataTable, Form fields, MediaUploader…
│   │   └── seo/                   # JsonLd, Breadcrumbs
│   ├── db/
│   │   ├── schema/                # Drizzle schema split by domain
│   │   ├── migrations/            # generated SQL + hand-written RLS/policies
│   │   ├── client.ts              # pooled connection (server-only)
│   │   └── seed/                  # dev seed data
│   ├── lib/
│   │   ├── env.ts                 # Zod-validated environment
│   │   ├── auth/                  # session helpers, requireUser, requireRole
│   │   ├── cache.ts               # cache tags & revalidation helpers
│   │   ├── logger.ts              # pino
│   │   ├── money.ts               # paise ↔ display, INR formatting
│   │   ├── rate-limit.ts
│   │   ├── errors.ts              # typed app errors → HTTP/UI mapping
│   │   └── utils.ts
│   ├── styles/globals.css         # tokens, Tailwind layers
│   └── proxy.ts                   # Next.js request proxy (middleware): redirects, admin gate, trailing slash
├── tests/
│   ├── unit/   tests/integration/   tests/e2e/
├── emails/                        # React Email templates (previewable)
├── scripts/                       # import-catalog.ts, rebuild-feed.ts
├── .github/workflows/ci.yml
├── drizzle.config.ts
├── next.config.ts
├── vercel.ts
├── tsconfig.json  (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
├── package.json
└── .env.example                   # documented variables, no values
```

### Structural rules

1. **`modules/*` are server-only.** They import `server-only` and are the only code that touches the database or third-party secrets. UI never imports a provider SDK.
2. **Each module exposes:** `queries.ts` (read, cacheable), `actions.ts` (server actions, validated with Zod, authorised), `schemas.ts` (Zod), `types.ts`. Nothing else is public.
3. **Providers are interfaces.** `PaymentProvider`, `ShippingProvider`, `EmailProvider`, `SearchProvider` have one implementation each in v1. The interface exists because switching vendors is a realistic business event (not a speculative abstraction).
4. **No cross-module DB joins in UI.** Pages call module queries; modules may call each other's queries, never each other's tables.
5. **Route groups isolate layouts** (storefront vs checkout vs admin) and keep the admin bundle out of the storefront.

---

## 4. Rendering strategy

| Route type | Strategy | Revalidation | Rationale |
|---|---|---|---|
| Home, category, collection, PDP, journal, guides, policies | **Static with ISR** (Cache Components: cached shell, `use cache` on data) | Tag-based `revalidateTag('product:slug')` on admin save + stock change; time fallback 1h | Instant TTFB, fully indexable HTML, stays fresh via explicit invalidation. |
| Dynamic islands on cached pages (price if campaign-scheduled, stock badge, wishlist state, cart count) | **Partial Prerendering**: static shell streams, dynamic hole suspends | Request-time | Keeps pages static while personalising small regions. |
| Search results, filtered PLP (`?material=…`) | **Dynamic SSR**, `Cache-Control: s-maxage=60, stale-while-revalidate` for anonymous | 60s | Many combinations; short CDN cache is enough. |
| Cart, checkout, account, admin | **Dynamic, no cache** | — | Personal data. |
| Sitemaps, feeds, robots | Route handlers, cached 1h | Cron rebuild | Cheap to regenerate. |

**Client components are limited to:** header interaction (menu, search box), product gallery, variant selector, add-to-cart, cart drawer, filter panel, checkout form, review form, admin forms/tables. Everything else is a Server Component.

**Review notes on this strategy:**
- *Invalidation storms.* A sale start flips `revalidateTag('pricing')` across every PDP and PLP at once. ISR serves the stale page while regenerating, so users are not blocked, but the first requests after a flip will show the old price for seconds. Acceptable; sale copy says "prices update at midnight" rather than promising an instant. Scheduled sales are also pre-warmed by a cron that touches the top 200 URLs right after the flip.
- *Cache Components / PPR maturity.* These are the newest parts of Next.js. If a blocking issue appears, the fallback is plain ISR pages plus small client islands that fetch personal state (cart count, wishlist) after hydration. The module layer does not change either way.
- *Price in HTML.* Price and availability must be present in the HTML Google receives. PPR streams the dynamic hole into the same response, so this holds; e2e tests assert price presence in the raw response body.

---

## 5. Data access and caching

- **Connection:** Drizzle over `postgres.js` through the Supabase connection pooler (transaction mode, `prepare: false` because transaction pooling cannot keep prepared statements) with a dedicated role `kesa_app` (no superuser, not the service role). See `11_SECURITY_REQUIREMENTS.md §6`.
- **Read path:** `modules/*/queries.ts` functions wrapped in `use cache` with `cacheTag()`; tags follow `entity:id` and `list:entity` conventions. Admin mutations call `revalidateTag()` for affected tags.
- **Write path:** Server Actions (`'use server'`) → Zod parse → authorisation → `db.transaction()` → outbox event → `revalidateTag`. Route Handlers only for webhooks, feeds, cron and the search-suggest endpoint.
- **Cache tags** (examples): `product:{slug}`, `category:{slug}`, `collection:{slug}`, `nav`, `homepage`, `page:{slug}`, `journal:{slug}`, `pricing` (campaign flips), `inventory:{variantId}`.
- **Money:** integers in paise everywhere in code and DB; formatted only at the UI edge.

---

## 6. Integration boundaries

### Payments (Razorpay)
1. Checkout action creates an internal `order` in `pending_payment` and a Razorpay Order (amount in paise, receipt = order number).
2. Client opens Razorpay Checkout with the order ID (publishable key only).
3. Success callback posts `razorpay_payment_id`, `order_id`, `signature` → server verifies HMAC and marks `paid`.
4. **Source of truth is the webhook** (`payment.captured`, `payment.failed`, `refund.processed`): signature verified, event ID stored for idempotency, order state machine advanced. Callback and webhook are both idempotent; whichever arrives first wins.
5. COD orders skip 1–4 and move to `confirmed` after optional OTP/manual verification.
6. **Idempotency:** the checkout client generates a UUID per attempt; the place-order action upserts on `orders.idempotency_key`, so retries and double-taps never create duplicate orders or duplicate Razorpay orders.
7. **Confirmation while settling:** if the webhook has not arrived when the customer lands on the confirmation page, the page shows "Confirming your payment" and polls `/api/orders/{number}/status` (max 60s) before showing success or a retry path. Never show success before `paid`.
8. **Late capture after cancellation:** handled per `11_SECURITY_REQUIREMENTS.md §7` (re-reserve or auto-refund).

### Shipping (Shiprocket)
- Pincode serviceability + estimated delivery date on PDP and checkout (cached per pincode 24h).
- Shipment creation from admin (or auto on `paid`): creates order in Shiprocket, assigns courier by rule, fetches AWB and label.
- Tracking via webhook + cron reconciliation; status mapped to internal `shipment_status`.

### Email (Resend)
- Templates in `emails/` (React Email). Sent only from outbox handlers so retries are safe.
- Sending domain subdomain (e.g. `mail.kesalifestyle.com`) with SPF/DKIM/DMARC.

### Background jobs (outbox + cron)
- Any side-effect of a transaction is written to `outbox_events` in the same transaction.
- `/api/jobs/process-outbox` (cron every minute, bearer-token protected, `SELECT … FOR UPDATE SKIP LOCKED`) dispatches handlers with retry/backoff and dead-lettering.
- Other crons: `release-stale-reservations` (15 min), `rebuild-merchant-feed` (hourly), `recompute-bestsellers` (daily), `recompute-rule-collections` (nightly), `expire-sale-prices` (hourly), `reconcile-payments` (hourly), `sync-shipment-tracking` (30 min), `order-sla-alerts` (hourly: paid but not shipped in 48h), `flush-analytics-buffer` (5 min), `sitemap-ping` (on publish).
- **Invoices and credit notes** are rendered as PDFs in an outbox job with `@react-pdf/renderer` (pure JS, no headless browser), stored privately and linked from the order. Headless Chromium was rejected for cold-start weight.

### Analytics
- Client: consent-gated GA4 via a single `track()` helper; dataLayer-style events listed in `10_ANALYTICS_TRACKING.md`.
- Server: purchase and refund events also sent via GA4 Measurement Protocol from the order service for accuracy.

---

## 7. Environments and configuration

| Env | Purpose | Data |
|---|---|---|
| `local` | Developer machine; Supabase local via CLI (Docker) or a dev project | Seed data |
| `preview` | Vercel preview per PR | Shared staging Supabase project; Razorpay test mode |
| `production` | Live | Production Supabase; Razorpay live |

- All variables validated at boot by `lib/env.ts` (Zod). Missing or malformed → build fails.
- Public variables prefixed `NEXT_PUBLIC_` are limited to: site URL, Razorpay key ID, GA measurement ID, Supabase URL + anon key.
- Secrets are stored in Vercel environment variables (and Supabase Vault for DB-side secrets), never in the repo. `.env.example` documents names only.

---

## 8. Error handling and logging

- **Typed errors** (`AppError` with `code`, `httpStatus`, `userMessage`, `cause`). Server actions return `{ ok: false, error }` for expected failures (validation, out of stock, coupon invalid) and throw only for unexpected ones.
- **Boundaries:** `error.tsx` per route group with branded fallback; `global-error.tsx`; `not-found.tsx` returns 404 with helpful content.
- **Logging:** `pino` JSON with `requestId`, `userId` (if any), `route`, `durationMs`. No PII beyond IDs. Sensitive fields redacted by logger config.
- **Sentry:** captures unexpected errors with release + source maps; 10% transaction sampling in production.
- **Webhook failures** return non-2xx so providers retry; the event is still logged.

---

## 9. Testing strategy (summary — full plan in `13_DEVELOPMENT_ROADMAP.md §7`)

| Level | Tooling | What |
|---|---|---|
| Unit | Vitest | Money math, discount engine, order state machine, SEO metadata builders, structured data generators, slug/redirect logic. |
| Integration | Vitest + test database (Supabase local / Postgres container) | Module queries and actions, inventory reservation under concurrency, outbox processing, RLS policy tests. |
| Component | Testing Library | Variant selector, filter panel, cart drawer, forms (a11y assertions). |
| E2E | Playwright | Browse → PDP → cart → checkout (Razorpay test mode) → confirmation; admin product create → storefront render; redirects; sitemap validity. |
| Non-functional | Lighthouse CI, axe, schema validators | Performance budgets, accessibility, structured data correctness on PR previews. |

---

## 10. Scalability path

| Pressure | First response | Later |
|---|---|---|
| Catalogue 10k+ SKUs | Postgres indexes + materialised facet counts | Meilisearch via `SearchProvider` |
| Traffic spikes (sales) | ISR + CDN already absorb reads; checkout is the only hot dynamic path | Read replica for reporting |
| Job volume | Outbox batch size tuning | Vercel Queues |
| Admin growth | Same app, lazy-loaded routes | Split `(admin)` into its own Vercel project sharing `modules/` via a workspace package |
| International | Currency/locale columns already exist on prices and content | i18n routing, multi-currency pricing tables |
