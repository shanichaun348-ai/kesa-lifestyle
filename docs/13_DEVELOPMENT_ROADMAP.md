# 13 — Development Roadmap

Phased delivery plan, milestones, definition of done, testing strategy and operating rhythm. Durations assume one primary coding agent (Claude Code) directed by the owner, with content/photography produced in parallel by the business. Estimates are planning aids, not commitments.

---

## 1. Phase summary

| Phase | Name | Outcome | Indicative duration |
|---|---|---|---|
| 0 | Foundation | Repo, tooling, CI, environments, database schema, design tokens, auth skeleton | 1–2 weeks |
| 1 | Catalogue & SEO storefront | Browseable, indexable storefront with admin catalogue management; no checkout | 3–4 weeks |
| 2 | Commerce launch | Cart, checkout, payments, COD, shipping, orders, account, emails, policies → **public launch** | 4–5 weeks |
| 3 | Growth | Reviews, wishlist polish, discounts UI, journal, guides, Merchant Center, analytics dashboard, redirects/SEO tooling | 3–4 weeks |
| 4 | Retention | Referral, loyalty, preferences centre, review photos, back-in-stock, WhatsApp/SMS, returns self-service | 3–4 weeks |
| 5 | Scale & hardening | Search engine upgrade if needed, performance tuning, pentest, admin split, marketplace sync exploration | ongoing |

Gate between phases: owner review against the phase's acceptance checklist.

---

## 2. Phase 0 — Foundation

**Goal:** a deployable, empty-but-correct application with every cross-cutting concern wired.

Deliverables:
1. Git repository initialised; branch strategy `main` (production) + feature branches + PR previews.
2. Next.js 16 app with TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint (next, ts, jsx-a11y), Prettier, pnpm, Husky/lint-staged.
3. Tailwind v4 with design tokens from `09_DESIGN_SYSTEM.md`; base `ui/` primitives (Button, Input, Sheet, Dialog, Accordion, Toast).
4. Supabase project (Mumbai) for staging; local dev via Supabase CLI; Drizzle schema for all entities in `05_DATABASE_DESIGN.md` with migrations, triggers, RLS policies, seed script.
5. `lib/env.ts` Zod env; `.env.example`; Vercel project linked with Preview/Production envs.
6. Auth: server-only Supabase flows (OTP code, magic link, Google PKCE exchange), `HttpOnly` cookies, login/verify pages, `requireUser`, `requireRole`, `admin_users` seeding; Supabase Auth SMTP pointed at Resend; proxy for admin host rewrite (`admin.{domain}`), trailing slash and redirect lookup; `/media/*` storage route.
7. Logging (pino), Sentry, error boundaries, `/api/health`.
8. Outbox table + worker route + Vercel cron config in `vercel.ts`.
9. CI: typecheck, lint, unit tests, migration-on-fresh-DB, build; Lighthouse CI skeleton.
10. `docs/` kept current; `README.md` with setup steps.

Acceptance: preview deployment renders a styled placeholder home with header/footer from the navigation tables; admin login works and is role-gated; migrations run from scratch; CI green.

---

## 3. Phase 1 — Catalogue & SEO storefront

**Goal:** the public site is complete for browsing and indexing; admin can manage the catalogue.

Admin:
- Products CRUD with size/length variants and **product families** ("duplicate as sibling"), media library (Supabase Storage upload, processing, blurhash), attributes, categories, collections (manual + rule, async recompute), tags, relations, care templates, size guides, search synonyms, SEO panel with previews and unique focus-keyword check, publish workflow, slug-change redirects, archive with redirect/410 choice, CSV import/export with dry run.
- Navigation, banners (announcement), homepage section builder, pages (About, policies, care guide), FAQ groups.
- Audit log for all of the above.

Storefront:
- Home, Women/Men landings, category PLPs with filters/sort/pagination/intro/body/FAQ, collections index + PLPs, PDP (gallery, variants, price, stock states, specs, care, shipping/returns summary, related), search (suggest + results), wishlist (guest cookie), content pages, FAQ, 404/410.
- SEO: metadata builders, canonicals, robots, sitemaps (products/categories/collections/pages with images), JSON-LD (Organization, WebSite, BreadcrumbList, Product/ProductGroup with Offer, CollectionPage/ItemList, FAQPage, WebPage), OG image generation, facet noindex rules, redirects.
- Performance: ISR + tags, image pipeline, fonts, budgets passing on PR previews.
- Analytics: consent sheet, GA4 with `view_item_list`, `select_item`, `view_item`, `search`, filter events.

Acceptance: 30 seeded products browse end-to-end; Rich Results test passes on PDP/PLP/FAQ; Lighthouse ≥ 90 on home/PLP/PDP; axe clean; sitemap valid; admin can create a product and see it live within seconds.

---

## 4. Phase 2 — Commerce launch

**Goal:** customers can buy. Public launch at the end of this phase.

- Cart (server-side, merge on login), cart drawer and page, coupons (code + automatic engine), pincode serviceability and delivery estimate.
- Checkout page (contact, address, shipping, gift option, payment), idempotent order placement, inventory reservations, Razorpay integration (order, checkout, signature verify, webhooks, reconciliation, late-capture handling), COD rules, confirmation page with payment-settling state, `/track-order/`.
- Orders admin: list, detail, timeline, state transitions, shipment creation via Shiprocket, **batch labels/packing slips/pick list/manifest**, tracking sync (webhook + cron), cancel, refunds with **credit notes**, notes, GST invoice PDF, finance CSV exports, pincode overrides, SLA alerts, admin alert emails.
- Customer account: orders, order detail + tracking, addresses, profile, wishlist (merged), email preferences (basic).
- Emails: login code, order placed/paid, payment failed, shipped, delivered, cancelled, refund; React Email templates; sending domain verified.
- Settings admin: store, GST, shipping, COD, return window; feature flags.
- Security hardening: CSP enforced, rate limits, Turnstile on forms, 2FA for Owner/Manager, RLS tests, webhook idempotency tests.
- Legal: policies, grievance officer, country of origin, consent records.
- Analytics: full ecommerce funnel incl. server `purchase`/`refund`.
- Ops: backups verified with a restore drill; uptime checks; incident runbook; launch SEO checklist (`06 §6`).
- Catalogue loaded (real products, photography, copy) by the business in parallel.

Acceptance: Playwright e2e passes for prepaid and COD orders in test mode; a real ₹1 live transaction succeeds and refunds; webhook replay is a no-op; all P0 requirements in `02_PRODUCT_REQUIREMENTS.md` met; DNS cut-over plan executed.

---

## 5. Phase 3 — Growth

- Reviews: eligibility, submission with photos, moderation, display, `AggregateRating`/`Review` schema, request emails.
- Journal: admin editor with Markdown + product directives, categories, index/article pages, `Article` schema, "From the Journal" modules on PLPs.
- Guides: builder with publishing checklist, gift/style guide templates, FAQ schema, launch set of 8 guides.
- Discounts UI polish: usage reports, BXGY, scheduled sales with `priceValidUntil`.
- Google Merchant Center feed + diagnostics screen; free listings live.
- Admin analytics dashboard (sales, funnel, searches, zero results, low stock, RTO rate).
- SEO tooling: redirect manager with CSV import and hits, cannibalisation report (focus keyword clashes), bulk SEO edits, GSC API summary (P1).
- Back-in-stock notifications; recently viewed; order editing; settlement and COD remittance reconciliation; search query reports.

Acceptance: review loop live end-to-end; ≥ 4 journal posts and 8 guides published meeting the checklist; feed approved with zero disapprovals; dashboard numbers reconcile with Razorpay settlements.

---

## 6. Phase 4 — Retention

- Referral programme (codes, links, qualification rules, rewards).
- Loyalty (earn/redeem at checkout, tiers, expiry, reversal on refund), account rewards page.
- Preference centre, marketing email integration (Resend Audiences or chosen ESP), abandoned-cart email with consent.
- Returns/exchange self-service with reverse pickup via Shiprocket.
- WhatsApp/SMS transactional notifications (provider decision), phone OTP login.
- Wishlist sharing; reorder; invoice download history.

Acceptance: a referral converts and rewards correctly after the return window; points ledger reconciles; return flow completes with refund.

---

## 7. Testing strategy

| Layer | Tool | Scope | Runs |
|---|---|---|---|
| Static | TypeScript strict, ESLint (incl. jsx-a11y), Prettier | Everything | Pre-commit + CI |
| Unit | Vitest | Money/tax math, discount engine, state machines, SEO builders, structured data, slug/redirect utils, Zod schemas, RBAC matrix, signature verification | CI (every PR), < 60 s |
| Integration | Vitest + Postgres (Supabase local in CI service container) | Module queries/actions, reservations under concurrency, outbox processing, RLS policies, rule-collection materialisation, search ranking smoke | CI (every PR) |
| Component | Testing Library + jsdom | Interactive islands with a11y assertions | CI |
| E2E | Playwright (Chromium mobile + desktop) | Browse → PDP → cart → checkout (Razorpay test mode) → confirmation; COD path; admin product create → storefront; login; redirects; 404/410; sitemap/robots validity | CI on PR previews (smoke) + nightly (full) |
| Non-functional | Lighthouse CI, axe-core, schema validator, bundle size | Budgets and a11y on key routes; JSON-LD validity | CI on PR previews |
| Manual | Checklists | Rich Results test, Merchant Center feed, real-device checks (Android Chrome, iOS Safari), payment live test | Phase gates |

Coverage target: critical modules (checkout, orders, payments, discounts, inventory, seo) ≥ 85% line coverage; no global coverage gate elsewhere.

Test data: deterministic seed; factories in `tests/factories`; Razorpay test mode keys in preview; webhooks replayed from recorded fixtures.

---

## 8. Definition of done (per feature)

1. Requirement ID referenced; behaviour matches `02`/`08` docs or the doc is updated.
2. Types strict; no `any`; Zod at boundaries.
3. Authorisation checked server-side; audit log for admin mutations.
4. Tests at the appropriate layers above; CI green.
5. Accessible: keyboard, labels, contrast, axe clean.
6. Performance budget respected (bundle delta justified).
7. SEO impact considered (metadata, canonical, schema, sitemap, redirects).
8. Logging and error handling in place; no silent catches.
9. Preview deployment reviewed on a real phone.
10. Docs/ADR updated if a decision changed.

---

## 9. Operating rhythm

- **Branching:** `main` auto-deploys to production after checks; features via PRs with preview URLs.
- **Releases:** small and frequent; database migrations backward-compatible (expand/contract) so deploys never need downtime.
- **Weekly review:** GSC coverage/rich results, Speed Insights, Sentry, failed jobs, zero-result searches, low stock, review queue.
- **Monthly:** dependency updates, backup restore drill (quarterly), SEO content refresh plan, roadmap re-prioritisation.

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Photography/content not ready | Launch slips or site looks thin | Start production in Phase 0; Phase 1 acceptance requires real imagery for ≥ 50 products |
| Razorpay KYC delays | Cannot test live payments | Apply immediately (D3); build against test mode |
| COD RTO losses | Margin erosion | Caps, OTP, blocklists, analytics on RTO by pincode |
| Scope creep in admin | Delays commerce launch | P0/P1/P2 discipline; admin polish after launch |
| SEO expectations too early | Disappointment | Organic takes 3–6 months; track leading indicators (indexed pages, impressions) |
| Vendor lock-in | Switching cost | Provider interfaces; data in plain Postgres; media URLs on our own domain |
| Cache Components / PPR immaturity in Next.js 16 | Rendering bugs or regressions | Fallback to plain ISR + client islands; module layer unaffected (`03 §4`) |
| Image optimisation cost growth on Vercel | Unexpected bill | Fixed device sizes, long cache TTL, monthly review, `/media/` URLs allow moving optimisation elsewhere |
| Single-agent bus factor | Knowledge loss | Docs + ADR + README kept current; code conventional and typed |

---

## 11. Immediate next steps after approval

1. Confirm decisions D1–D18 (`01_PROJECT_OVERVIEW.md §7`).
2. Owner creates accounts: domain/DNS, Vercel, Supabase (Mumbai), Razorpay, Shiprocket, Resend, Google (GA4, GSC, Merchant Center), Sentry, GitHub.
3. Install Vercel CLI (`npm i -g vercel`) and Supabase CLI locally.
4. Begin Phase 0.
