# Database Production Audit

**Date:** 2026-10-06  
**Status:** Schema written, migrations pending run

---

## Current State

| Layer | Status |
|-------|--------|
| Schema design | ✅ Complete — `supabase/migrations/` |
| SQL migrations | ✅ Written — 3 migration files |
| Stored procedures | ✅ Written — atomicity + idempotency RPCs |
| RLS policies | ✅ Written — deny-all by default, service role bypasses |
| Supabase client | ✅ `src/lib/supabase.ts` — service role, server-only |
| SupabaseOrderRepository | ✅ `src/modules/orders/supabase-repository.ts` |
| `queries.ts` switch | ✅ Activates when `SUPABASE_URL` is set |
| Credentials in `.env.local` | ❌ Not configured — migrations not run |
| Real Supabase project | ❌ Not created |
| Integration tests | ❌ Require a live Supabase instance |

---

## Migration Files

### `supabase/migrations/001_orders_schema.sql`

Tables created:

| Table | Purpose |
|-------|---------|
| `product_variants` | Authoritative inventory stock counter |
| `orders` | Order header with status, pricing snapshot |
| `order_items` | Immutable line-item snapshot |
| `payment_transactions` | Per-attempt payment records |
| `webhook_events` | Persistent webhook idempotency store |
| `inventory_reservations` | Tracks which SKUs are reserved per order |
| `coupon_redemptions` | Prevents duplicate coupon use |
| `checkout_idempotency_keys` | Prevents duplicate order creation on retries |

Key constraints:
- `orders.status` — CHECK constraint enforces valid statuses
- `webhook_events.idempotency_key` — UNIQUE (deduplicates retries)
- `inventory_reservations(order_id, sku)` — UNIQUE
- `coupon_redemptions(coupon_code, order_id)` — UNIQUE
- `payment_transactions.razorpay_payment_id` — UNIQUE
- `product_variants.available_stock >= 0` — CHECK prevents oversell

### `supabase/migrations/002_rls_policies.sql`

- RLS enabled on all 8 tables
- Anon role: read-only access to `product_variants` (stock display)
- All other tables: no anon/authenticated access (deny by default)
- Service role bypasses RLS (used by all server-side code)

### `supabase/migrations/003_stored_procedures.sql`

| Function | Purpose |
|----------|---------|
| `create_order_with_inventory` | Atomically: check idempotency, lock inventory (FOR UPDATE), reserve stock, create order + items + coupon redemption |
| `release_order_inventory` | Restore `available_stock`, mark reservations as released |
| `record_webhook_event` | INSERT with ON CONFLICT — returns TRUE if newly recorded |

---

## Gap Analysis

### Gaps that block production launch

1. **No Supabase project created** — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` not set.  
   Fix: Create project at supabase.com, run migrations via Supabase CLI or dashboard SQL editor.

2. **Migrations not applied** — schema exists in files but not in any database.  
   Fix: `supabase db push` or paste migration SQL into Supabase SQL editor.

3. **`product_variants` table not seeded** — the `create_order_with_inventory` RPC looks up SKUs in this table. If it's empty, all orders return `PRODUCT_NOT_FOUND`.  
   Fix: Add a seed migration or seed script that populates `product_variants` from the demo catalog.

4. **No integration tests** — correctness of stored procedures is untested without a live DB.  
   Fix: Configure a test Supabase project or local PostgreSQL and run the tests in `tests/integration/`.

### Gaps that are acceptable for MVP

5. **Admin orders view** — uses `DemoOrderRepository` for the admin panel. Production admin views need to query Supabase directly.

6. **`product_variants` sync** — if catalog changes, `available_stock` needs to stay in sync. Out of scope for Phase 4.

7. **Webhook event cleanup** — `webhook_events` grows indefinitely. Add a scheduled cleanup job after launch.

---

## To Apply Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push

# Or paste into Supabase SQL editor in order:
# 1. supabase/migrations/001_orders_schema.sql
# 2. supabase/migrations/002_rls_policies.sql
# 3. supabase/migrations/003_stored_procedures.sql
```

Then set in `.env.local`:
```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## Final Gate

**DATABASE: NOT CONNECTED** — schema correct, credentials absent, migrations not run.  
**PRODUCTION READY: NO** — requires Supabase project, applied migrations, and seeded `product_variants`.
