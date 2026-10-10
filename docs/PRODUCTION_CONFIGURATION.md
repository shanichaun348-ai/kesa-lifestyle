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

### Order confirmations: email (Resend)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender, e.g. `Kesa Lifestyle <orders@kesalifestyle.com>` (domain must be verified in Resend) |
| `ORDER_NOTIFY_EMAIL` | Optional. Shop inbox that gets a copy of every new paid order |

**Behaviour when missing:** the confirmation is skipped and a `{"event":"email","action":"skipped_unconfigured"}` line is logged. Checkout still succeeds. Admin → order → "Resend confirmation email" reports the same error.

### Order confirmations: WhatsApp (Meta WhatsApp Business Platform)

| Variable | Description |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Permanent system-user token with `whatsapp_business_messaging` and `whatsapp_business_management` |
| `WHATSAPP_PHONE_NUMBER_ID` | The sender number's **Phone number ID** from WhatsApp Manager (a numeric ID, not the phone number) |
| `WHATSAPP_ORDER_TEMPLATE` | Approved template name. Default `order_confirmed` |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Language the template was approved in. Default `en` |
| `WHATSAPP_API_VERSION` | Optional. Graph API version, default `v21.0` |

Setup, once:

1. In [Meta Business Suite](https://business.facebook.com/) create a WhatsApp Business account and add the shop's number as a sender (it cannot be a number already on the WhatsApp app unless you migrate it).
2. WhatsApp Manager → Message templates → Create. Category **Utility**, name `order_confirmed`, language English. Body (four parameters, in this order):

   ```
   Hi {{1}}, thank you for shopping with Kesa Lifestyle. Your order {{2}} is confirmed and we have received your payment of {{3}} for {{4}}. We will message you again when it ships.
   ```

   Sample values for review: `Priya`, `KL-1042`, `₹1,299`, `Pearl Drop Earrings × 1`. Approval usually takes minutes to a few hours.
3. Business Settings → System users → create a system user with Admin role, assign the WhatsApp app, and generate a **permanent** token. Set it as `WHATSAPP_ACCESS_TOKEN`.
4. Copy the Phone number ID from WhatsApp Manager → Phone numbers into `WHATSAPP_PHONE_NUMBER_ID`.
5. Redeploy. Test with Admin → Orders → a paid order → "Resend WhatsApp confirmation".

Messages go to the mobile number the customer typed at checkout, normalised to `91XXXXXXXXXX`. Orders without a valid Indian mobile are skipped with a logged reason. The template body lives on Meta's side; the code only fills the four parameters (`src/modules/whatsapp/order-confirmation.ts`).

**Behaviour when missing:** skipped and logged as `{"event":"whatsapp","action":"skipped_unconfigured"}`. Email still goes out; checkout still succeeds.

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
- [ ] Apply migrations: `supabase db push` (or paste each file under `supabase/migrations/` into the Supabase SQL editor, in order). `011_site_content.sql` is what lets Admin → Content → Homepage save the "Shop the look" picks; until it is applied the page shows the newest live pieces and the editor reports the missing table.
- [ ] Seed `product_variants` table from the catalog
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` to the same value as `RAZORPAY_KEY_ID`
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the production domain
- [ ] Set `ADMIN_SESSION_SECRET` (min 32 random chars)
- [ ] Set `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD_HASH`
- [ ] Run `pnpm build` — must pass with no errors
- [ ] Smoke-test checkout end-to-end in a staging environment
