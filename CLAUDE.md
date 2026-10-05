@AGENTS.md

# Kesa Lifestyle — project guide for coding agents

Premium D2C fashion-jewellery storefront for India. Next.js 16 App Router, React 19, TypeScript strict
(`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), Tailwind v4, Supabase Postgres + Drizzle, Razorpay.

## Read first
- `docs/00_ARCHITECTURE_DECISION_RECORD.md` — every major decision with rationale (ADR-01…33). Change the ADR before changing architecture.
- `docs/01_PROJECT_OVERVIEW.md §7` — owner decisions D1–D21 still pending (domain, tagline, COD policy, return window…). Where code depends on one, it is labelled "pending decision Dn". Do not silently resolve them.
- `README.md` — setup, scripts, database, checkout and env-var documentation.
- `docs/06_SEO_STRATEGY.md`, `docs/08_ECOMMERCE_REQUIREMENTS.md`, `docs/11_SECURITY_REQUIREMENTS.md` for the rules the code enforces.

## Current state (as of the last commit)
Built: design system (`/design-system/`), homepage, catalogue listings and product pages, server-side cart,
checkout, Razorpay payment lifecycle, Drizzle schema + migrations with RLS, dev seed, PGlite-based test suite,
customer accounts (server-only Supabase password auth, `/account/*`, per-user scoped account service with
authorization tests in `tests/db/account-authz.test.ts`).
Not built yet: Postgres implementation of `CatalogRepository` (listings still read the
in-memory demo repository over `src/lib/demo/seed-catalog.ts`, whose SKUs match the DB seed), email sending from
the outbox, refunds, shipments, admin.

## Non-negotiable conventions
- **Nothing fake presented as real.** Demo data lives under `src/lib/demo/` and is labelled. No invented reviews or
  ratings anywhere; reviews come only from the reviews table. Placeholder UI says so on the page.
- **Money is integer paise** (`src/lib/money.ts`). The server computes every amount; the browser sends SKUs,
  quantities and choices only.
- **Server-only secrets.** `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, Razorpay secrets are read only in
  `src/lib/env.ts` and server-only modules; `tests/unit/secrets-boundary.test.ts` enforces this. There is no
  Supabase browser client (ADR-32): auth flows run through Server Actions and route handlers.
- **Data access** goes through Drizzle as the `kesa_app` role with authorisation enforced in module code; RLS is a
  backstop (ADR-26). New tables: add to `src/db/schema/*`, run `pnpm db:generate`, enable RLS and add the
  `appAll()` policy, add `updated_at` trigger wiring if the table has `updated_at`.
- **SEO rules** (docs/06 §1.7.1): facets are query params, whitelisted, canonicalised; only unfiltered listings are
  indexable; product URLs are `/products/{slug}/`; colour/finish are sibling products, not variants (ADR-29).
- **Design tokens** only (`text-ink`, `bg-surface`, `border-line`, `text-brand`…); no raw hex or default Tailwind
  palette in storefront code. Components in `src/components/ui` are vendored shadcn primitives restyled to tokens.
- Server Components by default; `"use client"` only for genuinely interactive islands.
- Trailing-slash URLs everywhere (`next.config.ts`); fetch internal APIs with the trailing slash.

## Verify before you say "done"
`pnpm check` (typegen + strict tsc + eslint + vitest) and `pnpm build`. Database changes must pass `tests/db/*`,
which run every migration and the seed inside embedded Postgres (PGlite) with a Supabase prelude. Report test and
build output honestly; do not claim browser verification you did not do.

## Environment
Copy `.env.example` → `.env.local`. Without `DATABASE_URL` the storefront runs on demo data and the bag/checkout
show a "not configured" notice. Local Supabase: `supabase start` (Docker), `pnpm db:migrate`, `pnpm db:seed`.

## Git
Branch `main` on `github.com/shanichaun348-ai/kesa-lifestyle` (private). Commit with a descriptive message when a
piece of work is complete and verified; never commit `.env.local`.
