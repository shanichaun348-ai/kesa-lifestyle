# 01 — Project Overview

**Project:** Kesa Lifestyle D2C ecommerce platform
**Status:** Discovery & architecture phase (no application code written)
**Date:** 2026-10-05
**Owner:** Kesa Lifestyle
**Document set:** `docs/00` – `docs/13`

---

## 1. Discovery findings

The working directory `Kesa-Lifestyle/` was inspected before anything was written.

| Item | Finding |
|---|---|
| Existing project | None. Directory was empty. |
| Existing files | None (before this `docs/` folder). |
| Package configuration | None (`package.json`, lockfiles absent). |
| Git configuration | Not a git repository. |
| Environment files | None (`.env*` absent). |
| Documentation | None. |
| Local tooling | Node 22.19, npm 10.9, pnpm 10.30, git 2.51 (Windows 10). Vercel CLI not installed. |

Conclusion: this is a greenfield build. Every decision below is made from a clean slate, with no legacy constraints.

---

## 2. Business context

Kesa Lifestyle currently sells fashion jewellery for women and men through Indian marketplaces (Meesho, Myntra and others). The marketplaces provide reach but not customer ownership, margin control, brand expression or data.

The company wants its own premium direct-to-consumer (D2C) website that:

1. Presents Kesa as a premium, modern jewellery brand rather than an "imitation jewellery" seller.
2. Sells directly, with India-first payments and logistics.
3. Earns durable organic Google traffic through a deliberate SEO and content architecture.
4. Reduces marketplace dependency over time.
5. Owns the customer relationship: accounts, order history, reviews, loyalty, referrals, email and messaging consent.
6. Scales to thousands of SKUs without a re-platform.

### Market and customer

- **Market:** India at launch. Architecture keeps the door open for cross-border later (multi-currency, international shipping) without designing for it now.
- **Customers:** Women and men who want jewellery that looks premium at an accessible price. Mobile-first audience (expect 75–85% of sessions on mobile). Many are already familiar with Kesa from marketplaces.
- **Price positioning:** Affordable luxury. The site must justify a price premium over marketplaces through experience, trust and brand.

### Positioning language

The brand must never read as "imitation" or "artificial" jewellery in customer-facing copy. Preferred vocabulary: *fashion jewellery*, *demi-fine look*, *everyday jewellery*, *statement pieces*, *plated*, *anti-tarnish*, *skin-friendly*. See `07_CONTENT_STRATEGY.md` for the voice guide and tagline evaluation.

Candidate tagline supplied by the business: **"Jewellery That Completes Your Look."** Alternatives are evaluated in `07_CONTENT_STRATEGY.md §2`. This is a decision for the business owner (see §7).

---

## 3. Goals, success metrics and non-goals

### Primary goals (12-month horizon)

| Goal | Metric | Target (proposal) |
|---|---|---|
| Premium brand experience | Qualitative review + bounce rate on PDP | PDP bounce < 45% mobile |
| Direct sales | Monthly D2C orders, conversion rate | Conversion 1.5–2.5% by month 6 |
| Organic traffic | Non-brand organic clicks (GSC) | Month-over-month growth; 10k+ organic sessions/month by month 9 |
| Customer ownership | % orders from registered customers, repeat rate | 25% repeat purchase rate within 180 days |
| Performance | Core Web Vitals (field) | All "Good" on mobile at p75 |
| Scalability | Catalogue size, admin throughput | 5,000+ SKUs without architecture change |

### Non-goals (v1)

- Multi-vendor marketplace features.
- International shipping and multi-currency (architecturally allowed, not built).
- Native mobile apps.
- Real gold/diamond jewellery (hallmarking, certification) flows.
- Custom/made-to-order jewellery workflows.
- Headless CMS integration (content is managed in the admin).

---

## 4. Guiding principles

These principles resolve trade-offs across the whole document set.

1. **SEO is a product feature, not a plugin.** URL structure, rendering strategy, data model and content model are designed around indexability and usefulness.
2. **Server-first.** Pages render on the server; client JavaScript is reserved for genuinely interactive islands (cart drawer, filters, image gallery, checkout).
3. **Mobile-first, then enhance.** Every layout is designed at 360px before any breakpoint is added.
4. **Premium is restraint.** Typography, whitespace and photography do the work. No gold gradients, no banner walls, no countdown timers.
5. **One source of truth per concern.** Prices, stock, order state and content live in Postgres and are managed through the admin, never duplicated in code.
6. **No fakes.** No placeholder APIs, no mocked payment flows presented as complete, no hardcoded secrets. If a feature is not done, it is not shipped.
7. **Boring, proven technology.** Fewer dependencies, each one justified in `00_ARCHITECTURE_DECISION_RECORD.md`.
8. **Security by default.** Deny-by-default authorization, validated inputs at every boundary, verified webhooks, least-privilege database roles.
9. **Measure everything that matters.** Analytics, logging and error tracking are part of "done".
10. **Build for the next 10×, not the next 1000×.** Thousands of products, tens of thousands of orders per month. Not millions.

---

## 5. Scope summary

The full requirements are in `02_PRODUCT_REQUIREMENTS.md`. At a glance:

**Storefront:** Home, Women, Men, category pages, collections (New Arrivals, Bestsellers, occasion-led), product detail, search, wishlist, cart, checkout (guest + account), account (orders, addresses, reviews, preferences), About, Contact, FAQ, policies, jewellery care guide, Journal, gift guides, style guides.

**Commerce:** Rich product model (SKU, variants, media, pricing, inventory, taxonomy, attributes, dimensions, care, shipping, returns, SEO fields, structured data), India payments (UPI, cards, netbanking, wallets, COD), shipping integration, order lifecycle, returns, coupons and discounts, referral and loyalty architecture.

**Admin:** Products, categories, collections, inventory, orders, customers, reviews, coupons, discounts, homepage content, journal, SEO metadata, redirects, navigation, banners, gift/style guides, analytics dashboards.

**Platform:** SSR/SSG, dynamic metadata, canonicals, sitemaps, robots, structured data suite, Merchant Center feed, redirects, 404s, analytics, security, performance budgets.

---

## 6. Team and ways of working

- **Primary coding agent:** Claude Code, following the documents in `docs/`.
- **Decision authority:** Business owner (you). Decisions are recorded in `00_ARCHITECTURE_DECISION_RECORD.md`; open items are listed in §7 below.
- **Change control:** Any architecture change updates the relevant doc and the ADR before code is written.
- **Definition of done:** Typed, tested where meaningful, accessible, performant within budget, logged, documented. See `13_DEVELOPMENT_ROADMAP.md §6`.

---

## 7. Decisions required before implementation

These items block or materially shape implementation. Everything else has a recommended default documented in the ADR.

| # | Decision | Why it matters | Recommended default |
|---|---|---|---|
| D1 | **Primary domain** (e.g. `kesalifestyle.com` vs `kesa.in`) | Canonical URLs, sitemap, Search Console, email domain, Merchant Center all depend on it. | `.com` with `.in` redirecting if both are owned. |
| D2 | **Tagline / positioning line** | Appears in `<title>` suffix, OG tags, homepage hero, Organization schema. | See evaluation in `07_CONTENT_STRATEGY.md §2`. Recommendation: keep *"Jewellery That Completes Your Look"* as positioning line, with a shorter brand line for visual use. |
| D3 | **Payment gateway** account | Razorpay is recommended. Needs a KYC-approved merchant account before checkout can be tested end to end. | Razorpay. |
| D4 | **Cash on Delivery** policy | Yes/no, order-value caps, COD fee, pincode restrictions, RTO risk management. | Enable COD with cap (e.g. ₹2,500), small COD fee, OTP confirmation. |
| D5 | **Shipping partner** | Shiprocket (aggregator) vs direct Delhivery/Bluedart contract. Affects integration and pincode serviceability. | Shiprocket for v1. |
| D6 | **GST and invoicing details** | GSTIN, legal entity name, registered address, HSN code (fashion jewellery typically HSN 7117, GST 3% — confirm with your CA), invoice numbering series. | Confirm with accountant. |
| D7 | **Policies** | Shipping SLA, return window (e.g. 7 days), exchange rules, non-returnable items (earrings for hygiene?), refund method. These become legal pages and `MerchantReturnPolicy` schema. | 7-day return, exchange on damage/defect, prepaid refunds to source, COD refunds to UPI/bank. |
| D8 | **Customer login method** | Email+password vs phone OTP vs Google. Phone OTP needs an SMS provider (MSG91 or similar) and costs per OTP. | Email magic-link/OTP + Google at launch; phone OTP in Phase 3. |
| D9 | **Hosting** | Vercel is recommended for Next.js. Confirm budget acceptance (Pro plan ~US$20/member/month at scale) or choose self-hosting. | Vercel. |
| D10 | **Database/Auth provider** | Supabase recommended (Postgres + Auth + Storage, India-adjacent region: Mumbai `ap-south-1`). | Supabase, Mumbai region. |
| D11 | **Initial catalogue source** | Will products be imported from Meesho/Myntra exports (CSV) or entered fresh? Affects the import tool in Phase 1. | CSV import tool in admin. |
| D12 | **Photography** | Premium product photography and editorial/lifestyle imagery are essential to the design direction. Who produces it, and when? | Required before Phase 1 launch. |
| D13 | **Journal / content production** | Who writes journal posts, style guides, gift guides? Frequency? | 2–4 pieces/month from Phase 3. |
| D14 | **Email sending domain and provider** | Transactional email needs a verified sending domain (e.g. `mail.kesalifestyle.com`). Resend recommended. | Resend. |
| D15 | **Analytics stack** | GA4 (required for Search Console / Merchant Center / Ads linking) plus a privacy-friendlier product analytics tool optional. Meta Pixel / CAPI if running Meta ads. | GA4 + Vercel Analytics; Meta CAPI when ads start. |
| D16 | **Admin users and roles** | Who needs admin access, and with which roles (owner, catalogue manager, support, content editor)? | Four roles as designed in `08_ECOMMERCE_REQUIREMENTS.md §9`. |
| D17 | **Monorepo vs single app** | Recommended single Next.js app with route groups for storefront and admin. Monorepo adds overhead not yet justified. | Single app. |
| D18 | **Trailing-slash URLs** | Your URL examples use trailing slashes (`/women/earrings/`). Must be fixed before launch; changing later means site-wide redirects. | Trailing slash **on**, enforced with 301s. |
| D19 | **Colour/finish as sibling products** (added in architecture review) | Each finish gets its own URL, photos and reviews, which wins "silver …" / "rose gold …" searches but means more catalogue entries. Changing this later means URL and review migrations. | Siblings in a product family (ADR-29); variants only for size/length. |
| D20 | **Gift wrap offering** (added in review) | Fee, packaging, message card. Affects checkout, packing slip and pricing. | Offer gift wrap at a small fee with a printed message. |
| D21 | **Admin on `admin.{domain}`** (added in review) | Needs a DNS record; isolates admin cookies and lets firewall rules target the admin host. | Yes. |

Everything else is decided with a documented default in `00_ARCHITECTURE_DECISION_RECORD.md` and can be changed before implementation at low cost.

---

## 8. Document map

| File | Purpose |
|---|---|
| `00_ARCHITECTURE_DECISION_RECORD.md` | Major decisions with alternatives and rationale |
| `01_PROJECT_OVERVIEW.md` | This document |
| `02_PRODUCT_REQUIREMENTS.md` | Functional requirements by area |
| `03_TECHNICAL_ARCHITECTURE.md` | Stack, project structure, rendering, data flow, integrations |
| `04_INFORMATION_ARCHITECTURE.md` | Site map, URL design, navigation, page templates |
| `05_DATABASE_DESIGN.md` | Entities, relationships, indexes, RLS, migrations |
| `06_SEO_STRATEGY.md` | Technical SEO, structured data, content SEO, feeds |
| `07_CONTENT_STRATEGY.md` | Voice, tagline, editorial model, content calendar |
| `08_ECOMMERCE_REQUIREMENTS.md` | Catalogue, pricing, cart, checkout, orders, payments, shipping, admin |
| `09_DESIGN_SYSTEM.md` | Tokens, typography, components, motion, imagery |
| `10_ANALYTICS_TRACKING.md` | Events, tooling, consent, dashboards |
| `11_SECURITY_REQUIREMENTS.md` | Threat model, controls, RLS, payments, secrets |
| `12_PERFORMANCE_REQUIREMENTS.md` | Budgets, rendering, caching, images, monitoring |
| `13_DEVELOPMENT_ROADMAP.md` | Phases, milestones, definition of done, testing strategy |
