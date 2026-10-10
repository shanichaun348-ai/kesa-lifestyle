# 00 — Architecture Decision Record

Major decisions for the Kesa Lifestyle platform. Each record states what we are doing, why, the alternatives considered and why the chosen approach is better. Status: **Proposed** until the owner approves; then **Accepted**. Superseded decisions stay in the file with a pointer to the replacement.

Decisions that require the business owner's input (D1–D18) are listed in `01_PROJECT_OVERVIEW.md §7` and are *not* repeated here except where a technical default is proposed.

---

## ADR-01 — TypeScript in strict mode everywhere

**Decision:** TypeScript with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; no `any`; shared types from Drizzle schema and Zod.
**Why:** Commerce bugs are expensive (wrong prices, stock, totals). Types catch whole classes of mistakes before runtime and make a single-agent codebase safer to evolve.
**Alternatives:** JavaScript with JSDoc (weaker guarantees, poorer tooling); non-strict TS (silently allows `undefined` leaks).
**Why better:** Strictness cost is front-loaded and small; the safety compounds over thousands of products and orders.

## ADR-02 — Next.js 16 App Router as a single full-stack application (custom build, not a commerce SaaS)

**Decision:** Build the storefront, account and admin in one Next.js 16 App Router application using React Server Components, Server Actions, Cache Components/PPR and ISR.
**Why:** The project's three hardest requirements (SEO-grade SSR/SSG, excellent mobile performance, premium bespoke design) are exactly what Next.js is strongest at. One codebase shares types, auth, data access and design tokens between storefront and admin.
**Alternatives considered:**
- *Shopify (Liquid or Hydrogen headless):* fast to launch, but monthly + transaction fees, limited URL/taxonomy control, Indian payments via third-party apps, data model constraints (metafields), and weaker ownership — contrary to the "reduce platform dependency" goal.
- *Medusa / Saleor / Vendure (open-source commerce engines):* capable, but a second runtime to host and learn, their own admin and plugin models, and still all SEO/content/design work to do. Over-engineered for a single brand at thousands of SKUs.
- *WooCommerce / WordPress:* easy content, poor performance/security posture, PHP ecosystem, difficult to keep premium and fast.
- *Astro + separate API:* excellent static output, but weaker for the dynamic halves (cart, checkout, admin) and splits the stack.
- *Remix/React Router, SvelteKit, Nuxt:* viable; Next.js chosen for the most mature ISR/PPR/image/metadata tooling and first-class Vercel support.
**Why better:** Full control of URLs, data and design; no per-order platform fees; proven SEO performance; one deployable.

## ADR-03 — Tailwind CSS v4 with design tokens; shadcn/ui (Radix) primitives copied into the repo

**Decision:** Tokens as CSS variables in `@theme`; utility classes for layout; shadcn components vendored and restyled; Lucide icons.
**Why:** Premium design is about discipline (type scale, spacing, restraint). Tokens make that enforceable; Tailwind produces tiny CSS; Radix handles accessibility edge cases in dialogs, menus, sheets.
**Alternatives:** CSS Modules/vanilla CSS (fine but slower to iterate, inconsistent spacing creeps in); Chakra/MUI (large runtime CSS-in-JS, generic look); Panda/StyleX (less ecosystem support).
**Why better:** Smallest runtime cost, strongest consistency, and the components live in our repo so there is no design lock-in.

## ADR-04 — PostgreSQL on Supabase (Mumbai region) as the single system of record

**Decision:** One Postgres database holds catalogue, commerce, customers, content and SEO data. Supabase provides managed Postgres, Auth and Storage.
**Why:** Commerce needs transactions, constraints and relational integrity (stock, orders, ledgers). Postgres also provides full-text and trigram search, JSONB for flexible config, and enums for state machines. Supabase bundles auth and storage with India-local hosting.
**Alternatives:** Neon + separate auth/storage (more assembly, no phone-OTP auth out of the box); PlanetScale/MySQL (no RLS, weaker FTS); MongoDB (poor fit for transactional commerce); Firebase (query limits, lock-in).
**Why better:** Fewest moving parts for the required capabilities; RLS available as a safety net; easy to migrate (plain Postgres) if ever needed.

## ADR-05 — Drizzle ORM with SQL migrations

**Decision:** Drizzle schema in TypeScript, drizzle-kit migrations plus hand-written SQL for triggers/policies/generated columns.
**Why:** Thin, SQL-transparent, fully typed, fast cold starts; we need precise SQL for facets, search ranking, locking and ledgers.
**Alternatives:** Prisma (heavier engine, slower cold starts, abstracts SQL we need); Supabase JS/PostgREST query builder (awkward joins/aggregates, pushes logic into DB functions); Kysely (good, but Drizzle integrates schema + migrations in one tool).
**Why better:** Control and type safety without a heavy runtime.

## ADR-06 — Supabase Auth for customers and admins; app-level RBAC

**Decision:** Email OTP code (primary) + magic link + Google at launch; phone OTP later via the Supabase SMS hook; sessions via Supabase SSR cookies issued by server-only flows (see ADR-32); admins are auth users listed in `admin_users` with roles; permissions enforced in server code.
**Why:** Managed, secure, supports Indian phone-first login later, integrates with RLS identities.
**Alternatives:** Auth.js (self-managed sessions and adapters, no built-in OTP/SMS); Clerk (excellent DX, per-MAU cost at scale, data outside India); custom auth (never).
**Why better:** Lowest cost and complexity for the needed features with a credible upgrade path.

## ADR-07 — Supabase Storage for media, `next/image` for delivery

**Decision:** Originals uploaded through server-side signed uploads into Supabase Storage; processed (resize, strip metadata, blurhash); served through `next/image` for responsive AVIF/WebP with CDN caching. `media_assets` abstracts URLs.
**Why:** Same vendor and policies as the database; `next/image` provides format negotiation and sizing with zero extra service.
**Alternatives:** Cloudinary/imgix (excellent transforms, additional vendor and cost); Vercel Blob (fine, but another store beside Supabase); S3 + Lambda (assembly required).
**Why better:** Simplicity now; swapping to a dedicated image CDN later touches only the URL builder.

## ADR-08 — Vercel hosting with Node.js on Fluid Compute, Mumbai region

**Decision:** Deploy to Vercel; functions default region `bom1`; use Vercel CDN, ISR, cron, Firewall, Analytics, Speed Insights. Node.js runtime (the Edge runtime is deprecated).
**Why:** First-party Next.js features (PPR, ISR, image optimisation, previews) work best on Vercel; previews per PR; built-in DDoS/WAF.
**Alternatives:** Cloudflare Workers via OpenNext (cheaper at volume, some Next.js features lag); AWS Amplify/ECS (more ops); self-hosted Docker on a VPS (cheapest, but we own uptime, caching and image optimisation).
**Why better:** Fastest path to excellent CWV and reliable deploys with a one-person engineering team. Owner decision D9 covers cost acceptance.

## ADR-09 — Razorpay as the payment provider behind a `PaymentProvider` interface

**Decision:** Razorpay Standard Checkout + Orders API + Webhooks; COD handled internally; interface allows a second provider.
**Why:** Broadest Indian payment coverage (UPI, cards, netbanking, wallets, EMI), robust webhooks, strong docs, test mode.
**Alternatives:** Cashfree (comparable, slightly lower fees in some cases), PayU, PhonePe PG, Stripe India (limited onboarding). Any can be added via the interface.
**Why better:** Lowest integration risk and best customer familiarity.

## ADR-10 — Shiprocket as the shipping aggregator behind a `ShippingProvider` interface

**Decision:** Shiprocket for serviceability, rates, AWB, labels, tracking and reverse pickups; local pincode table for instant lookups.
**Why:** Multi-courier coverage across India without separate courier contracts; COD remittance handling; webhooks.
**Alternatives:** Delhivery/Bluedart direct (better rates at volume, single-courier coverage gaps); other aggregators (Pickrr, NimbusPost); manual fulfilment.
**Why better:** Breadth and simplicity at launch; direct contracts can be added later behind the same interface.

## ADR-11 — Postgres full-text + trigram search first; search provider interface

**Decision:** `tsvector` + `pg_trgm` with a `SearchProvider` interface and a suggest endpoint; Meilisearch/Typesense only if relevance or latency demands.
**Why:** Thousands of SKUs is comfortably within Postgres capability; one less service to run, pay for and keep in sync.
**Alternatives:** Algolia (excellent, costly at scale), Meilisearch/Typesense (great, need hosting + sync), Elasticsearch (overkill).
**Why better:** Zero sync problems and cost at launch; a clean upgrade path.

## ADR-12 — Resend + React Email for transactional email

**Decision:** Typed React Email templates sent via Resend from outbox handlers only; verified sending subdomain.
**Why:** Deliverability tooling, simple API, templates in code with previews and tests.
**Alternatives:** AWS SES (cheapest, more setup), Postmark (excellent, pricier), SendGrid.
**Why better:** Best DX/deliverability balance; cheap at our volumes; swappable via `EmailProvider`.

## ADR-13 — Transactional outbox + Vercel Cron for background work

**Decision:** Side-effects (emails, feed rebuilds, stock release, analytics) are written to `outbox_events` in the same transaction as the business change and processed by a cron-invoked worker with retries and dead-lettering.
**Why:** Guarantees no lost emails/updates on failures, keeps request handlers fast, needs no extra infrastructure.
**Alternatives:** Fire-and-forget calls (lossy); Vercel Queues (good, still beta; can replace the worker later); Inngest/Trigger.dev (external service and cost); BullMQ + Redis (extra infra).
**Why better:** Reliability with the smallest footprint; data stays in Postgres and is observable in the admin.

## ADR-14 — Zod schemas as the single validation source

**Decision:** Zod for forms, server actions, route handlers, webhooks, CSV imports, JSON config columns and environment variables; types inferred from schemas.
**Why:** One definition yields runtime validation and static types; the "no fake APIs, no unvalidated input" principle requires this at every boundary.
**Alternatives:** Valibot (smaller, less ecosystem), Yup, hand-written checks.
**Why better:** Ubiquitous, well-supported, fits React Server Actions well.

## ADR-15 — GA4 + Vercel Analytics with a typed `track()` and server-side purchase events; no tag manager

**Decision:** Consent-gated GA4 via a single helper; Vercel Web Analytics/Speed Insights always; server Measurement Protocol for purchases/refunds; internal event store for the admin dashboard.
**Why:** GA4 is required for Google Search Console, Merchant Center and Ads; server events ensure revenue accuracy; minimal JS keeps CWV.
**Alternatives:** GTM (flexibility at the cost of JS weight and an unaudited injection point), PostHog/Plausible (good, but GA4 still needed for Google linking), Segment (cost).
**Why better:** Accurate, light and auditable.

## ADR-16 — Sentry + pino structured logging

**Decision:** Sentry for errors/traces (sampled), pino JSON logs with request IDs and PII redaction to Vercel logs/drains.
**Why:** Production-grade error handling demands source-mapped stack traces and searchable logs.
**Alternatives:** Console logs only (unsearchable), Datadog/New Relic (cost), Axiom/Logtail (fine as a drain target later).
**Why better:** Low setup, strong Next.js integration.

## ADR-17 — Testing pyramid: Vitest, Testing Library, Playwright, Lighthouse CI, axe

**Decision:** Unit and integration tests in Vitest against a real Postgres in CI; component tests with Testing Library; Playwright e2e for the purchase path and admin-to-storefront flow; Lighthouse CI and axe on previews.
**Why:** Checkout, pricing, inventory and SEO output must not regress; budgets must be enforced automatically.
**Alternatives:** Jest (slower, more config), Cypress (heavier), no e2e (unacceptable for checkout).
**Why better:** Fast feedback and real-browser confidence where it matters.

## ADR-18 — pnpm, GitHub, GitHub Actions, Vercel previews; single app, not a monorepo

**Decision:** Single Next.js app with route groups for storefront/checkout/account/admin; pnpm; CI on GitHub Actions; previews on Vercel.
**Why:** No premature abstraction. A monorepo adds build orchestration for no current benefit; route groups already isolate bundles and layouts.
**Alternatives:** Turborepo with `apps/web`, `apps/admin`, `packages/db`… (justified only when teams or deploy cadences diverge).
**Why better:** Simpler setup, faster CI, trivial to extract packages later because `modules/` is already server-only and dependency-clean. Owner decision D17.

## ADR-19 — Content is first-party structured data in Postgres with an in-app admin; no external CMS

**Decision:** Homepage sections, navigation, banners, pages, journal, guides and FAQs are tables edited in `/admin`, rendered by templates; Markdown with a sanitised subset and product directives.
**Why:** Content is tightly coupled to products (shoppable modules, rule collections, SEO fields). One store avoids sync, webhooks and a second permission system.
**Alternatives:** Sanity/Contentful (great editors, cost, split data), Payload (runs inside Next.js and is attractive, but imposes its own data model and admin on commerce entities), MDX in repo (developer-only editing).
**Why better:** Owner's team edits everything in one place; content participates in the same cache tags, audit log and RBAC.

## ADR-20 — Server state over client state; no GraphQL

**Decision:** Cart, wishlist and account data are server state fetched in Server Components and mutated through Server Actions; client islands hold only UI state. No global store, no GraphQL layer.
**Why:** Removes an entire class of sync bugs and shrinks JS; the only consumer of the data is our own UI.
**Alternatives:** Redux/Zustand + REST/GraphQL (needed for SPAs and multi-client APIs; not our case), tRPC (nice, but Server Actions already give typed RPC).
**Why better:** Less code, better performance, simpler mental model.

## ADR-21 — Money as integer paise; GST-inclusive MRP pricing

**Decision:** All amounts are integers in paise; display formatting at the UI edge; prices are MRP inclusive of GST with tax derived for invoices (basis points per product).
**Why:** Floating point errors are unacceptable in totals; Indian consumer pricing is tax-inclusive.
**Alternatives:** Decimal strings (safe but awkward), floats (never), tax-exclusive pricing (confusing for Indian shoppers).
**Why better:** Exact arithmetic, simplest display, correct invoices.

## ADR-22 — URL and taxonomy design: product URLs flat, categories ≤ 2 levels, facets non-canonical, collections for intent

**Decision:** `/products/{slug}/`, `/women/{category}/`, `/men/{category}/`, `/collections/{slug}/`; facets and sort as query params (noindex, canonical to base); pagination indexable; trailing slash on; slugs immutable with auto-301.
**Why:** Prevents duplicate content from multi-category products, keeps crawl budget on valuable pages, allows unlimited merchandising via collections without URL churn.
**Alternatives:** Nested product URLs under categories (duplicates/canonical headaches), indexed facet URLs (thin pages, crawl waste), deep category trees (rigid).
**Why better:** Proven ecommerce SEO structure with the fewest ways to go wrong. Trailing slash is owner decision D18.

## ADR-23 — Structured data generated from the database, never hand-authored

**Decision:** `modules/seo/structured-data.ts` builds Organization, WebSite, BreadcrumbList, Product/ProductGroup with Offer, MerchantReturnPolicy and OfferShippingDetails (by `@id`), CollectionPage/ItemList, Article, FAQPage from entity data; unit-tested; checked with Rich Results tests on previews.
**Why:** Accuracy and consistency across thousands of pages; prices/availability in schema always equal the page and feed.
**Alternatives:** Admin JSON-LD fields (error-prone), plugins (none in a custom stack).
**Why better:** Zero drift; richer results with no editorial effort.

## ADR-24 — Rule-based collections are materialised

**Decision:** Rule collections store rules and also persist membership in `collection_products`, recomputed on product change (trigger/outbox) and nightly.
**Why:** PLP queries stay simple and fast; sitemaps and feeds can read membership directly.
**Alternatives:** Evaluating rules at query time (complex SQL per request, hard to cache), app-level filtering (slow).
**Why better:** Performance and simplicity, at the cost of a small recompute job we need anyway for bestsellers.

## ADR-25 — Controlled attribute vocabularies (EAV-lite) instead of free-text or fixed columns

**Decision:** `attributes` / `attribute_values` / `product_attribute_values` with an aggregated `attribute_value_ids[]` on products for fast faceting; attributes marked filterable/spec.
**Why:** Facets, specs, schema `material`/`color`, feed fields and SEO collections all need consistent values that admins can extend without migrations.
**Alternatives:** Fixed columns per attribute (migration per new attribute; multi-value awkward), free-text tags (inconsistent facets), JSONB blob (hard to index/validate).
**Why better:** Flexible yet controlled, indexable, admin-manageable.

## ADR-26 — Deny-by-default RLS with the Data API disabled; Next.js server as the only data gateway

**Decision:** RLS enabled on all tables; no `anon` policies; PostgREST exposure of `public` disabled; `kesa_app` role used by Drizzle with explicit policies; authorisation enforced in server code.
**Why:** Eliminates the most common Supabase misconfiguration (open tables via the auto-API) while keeping RLS as a universal backstop.
**Alternatives:** Client-side Supabase queries with RLS as the primary auth layer (fast to build, hard to audit complex commerce rules, leaks schema), service-role everywhere (bypasses RLS entirely).
**Why better:** Defence in depth with a single, testable authorisation path.

## ADR-27 — Webhooks are the source of truth for payment state; callbacks are optimistic

**Decision:** Order marked paid on verified webhook or verified callback, whichever is first; both idempotent; hourly reconciliation with the gateway.
**Why:** Browser callbacks are unreliable (closed tabs, network); webhooks can be delayed; combining both with idempotency gives correctness and speed.
**Alternatives:** Callback-only (lost payments), webhook-only (slow confirmation UX).
**Why better:** Correct under every failure mode we can anticipate.

## ADR-28 — Phone OTP, WhatsApp/SMS, referral and loyalty are architected now, built later

**Decision:** Tables, ledgers and consent records exist from Phase 0; UI and integrations ship in Phase 4.
**Why:** Avoids painful data migrations (e.g. retrofitting a points ledger) while keeping the commerce launch focused.
**Alternatives:** Build everything for launch (delays revenue), ignore until needed (costly retrofit).
**Why better:** Cheap schema now, no premature features.

## ADR-29 — Colour and finish are sibling products in a family; variants are for size and length only

**Decision:** `product_families` groups sibling products that differ by colour/finish; each sibling has its own slug, media, copy, reviews, canonical URL and feed item (`item_group_id = family`). `product_variants` are reserved for size/length.
**Why:** Jewellery search demand is finish-specific ("silver pearl earrings", "rose gold chain"). One URL per finish can rank for those queries; a variant on a shared URL cannot. Reviews and photos are also finish-specific.
**Alternatives:** All options as variants on one URL (simplest entry, loses finish-level ranking, mixed-finish reviews); indexable variant URLs (`?variant=`) with per-variant canonicals (fragile, thin duplicate pages).
**Why better:** Matches how customers search and how Google models product groups; cheap now, very expensive to retrofit (URL, redirect and review migrations). Owner decision D19.

## ADR-30 — Media served from our own domain (`/media/*`)

**Decision:** Storage objects are exposed through a `/media/[...path]` route (or rewrite) on the primary domain; every stored image URL, image sitemap entry, `og:image`, feed `image_link` and schema `image` uses it.
**Why:** Image URLs are indexed and shared; tying them to a vendor hostname makes a storage or CDN migration an SEO event. It also simplifies CSP.
**Alternatives:** Direct `*.supabase.co` URLs (vendor lock-in of indexed URLs); custom domain on the storage bucket (vendor-specific feature).
**Why better:** URL stability for the life of the brand at near-zero cost.

## ADR-31 — Admin served on a separate hostname from the same application

**Decision:** `admin.{domain}` maps to the `(admin)` route group via a host check in the request proxy; `/admin/*` does not exist on the public host.
**Why:** Cookie isolation between admin and storefront sessions, clean application of the strict nonce CSP to dynamic admin routes, firewall rules (rate limits, optional IP allowlist) scoped to the host, and no admin paths discoverable on the storefront.
**Alternatives:** `/admin` on the main host (shared cookies and CSP, discoverable); a separate deployed app (duplicated build and shared package plumbing not yet justified).
**Why better:** Most of the isolation benefit of a separate app with none of the build cost. Owner decision D21.

## ADR-32 — Auth flows are server-only; no Supabase browser client; `HttpOnly` session cookies

**Decision:** OTP request/verify, OAuth PKCE code exchange, sign-out and session refresh run in Server Actions / route handlers with the Supabase server client. No `@supabase/supabase-js` in client bundles.
**Why:** The Supabase browser client reads session cookies from `document.cookie`, which forces them to be readable by JavaScript (not `HttpOnly`) and thus stealable by any XSS. A server-only flow keeps tokens out of reach of scripts and shrinks the client bundle.
**Alternatives:** Standard `@supabase/ssr` browser + server pattern (simpler, weaker cookie posture); custom JWT sessions (reinventing auth).
**Why better:** Strictly stronger security at the cost of writing a handful of server actions we need anyway.

## ADR-33 — Two Content Security Policies: strict nonce for dynamic routes, allowlist for static routes

**Decision:** Dynamic routes (checkout, account, auth, admin) get a per-request nonce with `'strict-dynamic'`; static/ISR storefront routes get a hostname allowlist without nonce (accepting `'unsafe-inline'` only if Next's hydration scripts cannot be hashed), with `object-src 'none'`, `base-uri 'self'` and no user-generated HTML on those pages.
**Why:** A nonce embedded in a cached page is reused across users, which is equivalent to no nonce. Pretending to have a strict CSP on static pages would be security theatre.
**Alternatives:** Make every page dynamic to support nonces (destroys the ISR/CDN performance model); hash every inline script (brittle across Next upgrades); a single weak policy everywhere (leaves checkout and admin less protected than they can be).
**Why better:** Strongest protection where secrets and money move, honest and still meaningful protection on cached pages.

## ADR-34 — Dark theme is a user toggle driven by one token set

**Decision:** The whole site offers a dark theme selected by a header toggle (stored in `localStorage`, OS preference as the default) and applied as `data-theme="dark"` on `<html>` before first paint by an inline script. Dark values override the same `--color-*` tokens; the `dark:` Tailwind variant is bound to the attribute, not to `prefers-color-scheme`. Gold (`brand`, `highlight`, `cta`) replaces cocoa for brand accents, headings and the primary button; body text is warm ivory. Controls drawn over photographs use theme-independent `on-image` / `image-scrim` tokens.
**Why:** The owner wants a premium dark presentation with gold text. Overriding tokens re-skins every component at once and keeps the "tokens only, no raw hex" rule intact; an inline pre-paint script avoids a light flash on a dark page; storing the choice client-side keeps the storefront cacheable (no per-user server rendering).
**Alternatives:** `prefers-color-scheme` only (no user control); a `next-themes` dependency (does the same thing with more code and a context provider); a server-side cookie theme (would make every page dynamic).
**Why better:** Smallest possible footprint (one script, one toggle, one CSS block) with full user control and no impact on the static rendering model.

## ADR-35 — WhatsApp order confirmations go direct through Meta's Cloud API

**Decision:** Order confirmations are sent on WhatsApp through the WhatsApp Business Platform (Meta Cloud API) with a pre-approved Utility template, alongside the Resend email. One orchestrator (`modules/notifications/order-paid.ts`) fans out to email, WhatsApp and the shop inbox after the PAID transition; each channel is independent, unconfigured channels are skipped and logged, and admins can re-send either channel from the order page. The template copy lives in Meta Business Manager; the code fills four parameters (first name, order reference, total paid, items).
**Why:** Transactional WhatsApp messages must be templates approved by Meta whichever vendor is used. Going direct avoids a reseller margin and a second dashboard, and the first 1,000 conversations a month are free. A thin `fetch` transport mirrors the Resend one, so there is no SDK to keep current.
**Alternatives:** A business solution provider (Interakt, WATI, Gupshup, Twilio) — simpler onboarding but a per-message markup and another vendor contract; sending from the WhatsApp Business app by hand — not automatable.
**Why better:** Lowest running cost and the same approval process either way; the provider can be swapped by replacing one 80-line transport module.

---

## Appendix A — Decision log

| Date | Change | Reason |
|---|---|---|
| 2026-10-05 | ADR-01 … ADR-28 proposed | Discovery and architecture phase |
| 2026-10-09 | ADR-34 added: user-selectable dark theme with gold accents | Owner request |
| 2026-10-10 | ADR-35 added: WhatsApp order confirmations via Meta Cloud API templates | Owner request |
| 2026-10-05 | Architecture review: ADR-29 … ADR-33 added; ADR-06 amended; facet signalling, OOS handling, collection/guide keyword split, async rule collections, `locations`, `discount_targets`, `guide_section_products`, `credit_notes`, idempotency keys, `ga_client_id`, gift options, batch fulfilment, finance exports, search synonyms, size guides, OTP-first auth, Supabase SMTP, `prepare: false`, image cost controls | CTO-style review of the proposal |

## Appendix B — Owner decisions pending (summary)

D1 domain · D2 tagline · D3 payment account · D4 COD policy · D5 shipping partner · D6 GST/invoicing · D7 policies · D8 login methods · D9 hosting/cost · D10 database/auth provider · D11 catalogue source · D12 photography · D13 content production · D14 email domain/provider · D15 analytics/ads · D16 admin users/roles · D17 single app vs monorepo · D18 trailing slash · D19 finish as sibling products · D20 gift wrap · D21 admin hostname. Details in `01_PROJECT_OVERVIEW.md §7`.
