# Production Configuration

## Overview

Kesa Lifestyle uses an explicit fail-closed configuration strategy: if required production environment variables are missing, the application throws at startup rather than silently falling back to in-memory/demo implementations.

**The application is NOT production-ready until all variables in the "Required in production" section are set.**

---

## Required in Production

These variables must be set before deploying to production. Missing any of them causes a startup failure.

### Database / Supabase

| Variable | Description | Example |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | `https://xyzabc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, bypasses RLS) | `eyJhb...` |

**Behaviour when missing:** `getOrderRepository()` throws `PRODUCTION STARTUP FAILURE` and the request fails. `DemoOrderRepository` (in-memory, per-process, not persistent) is **never** selected in production.

### Payments / Razorpay

| Variable | Description |
|---|---|
| `RAZORPAY_KEY_ID` | API key ID (used for server-side order creation) |
| `RAZORPAY_KEY_SECRET` | API secret (server-only, used for HMAC and order creation) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret from the Razorpay dashboard |

**Behaviour when missing:** `requireRazorpayConfig()` throws at the point of use (checkout API routes). Checkout is disabled at the page level when `RAZORPAY_KEY_ID` is absent.

### Admin

| Variable | Description |
|---|---|
| `ADMIN_SESSION_SECRET` | HMAC-SHA256 signing key for admin session tokens (≥32 chars) |
| `ADMIN_BOOTSTRAP_EMAIL` | Email address for the bootstrap admin account |
| `ADMIN_BOOTSTRAP_PASSWORD_HASH` | bcrypt hash of the bootstrap admin password |

---

## Public Variables (Safe for Browser)

These are inlined into the client bundle by Next.js. They are not secret.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (e.g. `https://kesalifestyle.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` — for Supabase client in browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key — for Supabase client in browser |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same key ID as `RAZORPAY_KEY_ID` — for Razorpay checkout modal in browser |

---

## Optional / Development Only

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Pooler connection for `kesa_app` role (migrations/seeds) | — |
| `DATABASE_DIRECT_URL` | Direct (non-pooled) connection for migrations | — |
| `CRON_SECRET` | Shared secret for authenticating cron job routes | — |
| `ALLOW_SEED` | Set to `"1"` to allow seed scripts against non-local DB | — |
| `ADMIN_HOST` | Restrict admin to a dedicated hostname (ADR-31) | unset = localhost OK |

---

## Secrets Boundary

**Server-only (must never reach the browser):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `ADMIN_SESSION_SECRET`
- `ADMIN_BOOTSTRAP_PASSWORD_HASH`
- `DATABASE_URL`, `DATABASE_DIRECT_URL`

**Safe for browser (NEXT_PUBLIC_ prefix):**
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

The secrets boundary is enforced by `tests/unit/secrets-boundary.test.ts`.

---

## Repository Selection

`src/modules/orders/queries.ts` implements the fail-closed selection:

```
SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set?
  YES → SupabaseOrderRepository (PostgreSQL, persistent, concurrency-safe)
  NO  → NODE_ENV === "production"?
          YES → throw PRODUCTION STARTUP FAILURE
          NO  → DemoOrderRepository (in-memory, dev/test only)
```

`DemoOrderRepository` limitations (never acceptable in production):
- Orders are lost on server restart
- Inventory oversell is possible in multi-process / serverless deployments
- Webhook idempotency is per-process (in-memory `Set`)

---

## Startup Failure Behaviour

When required production configuration is missing:
- `getOrderRepository()` throws synchronously at first request
- The Vercel function returns a 500; the storefront shows an error page
- The error message names the missing variables and links to this document
- No fallback is attempted; no demo data is served

This is intentional: silent fallback to in-memory storage in production would cause orders to be permanently lost and inventory to be silently oversold.

---

## Remaining Intentional Demo Usages

The following demo/in-memory usage is **intentional** and isolated to non-production contexts:

| Location | Type | Justification |
|---|---|---|
| `src/modules/orders/demo-repository.ts` | In-memory orders, inventory, webhooks | Dev/test only; never selected in production |
| `tests/unit/orders/repository.test.ts` | Direct `DemoOrderRepository` instantiation | Unit tests |
| `tests/unit/security/payment-integration.test.ts` | DemoOrderRepository in test fixtures | Unit tests |
| `src/lib/demo/seed-catalog.ts` | In-memory product catalog | Storefront demo; replaced by DB product queries before launch |
| All `tests/` files | Any demo/mock usage | Test environment only |

---

## Go-Live Checklist

- [ ] Create Supabase project; set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Apply migrations: `supabase db push`
- [ ] Seed `product_variants` table from the catalog
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` to the same value as `RAZORPAY_KEY_ID`
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the production domain
- [ ] Set `ADMIN_SESSION_SECRET` (min 32 random chars)
- [ ] Set `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD_HASH`
- [ ] Run `pnpm build` — must pass with no errors
- [ ] Smoke-test checkout end-to-end in a staging environment
