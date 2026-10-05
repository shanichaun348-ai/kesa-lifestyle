# Payment & Checkout Security Audit

**Date:** 2026-10-06
**Scope:** Checkout flow, Razorpay integration, order management, inventory, webhooks
**Auditor:** Claude Sonnet 4.6

---

## 1. Architecture

```
Browser (Client)
  │  submits: SKU + quantity + customer info + address + coupon code
  │  NEVER submits: price, subtotal, discount, GST, shipping, total
  ▼
POST /api/checkout/orders
  ├─ Input validation (400 if invalid)
  ├─ computeOrderPricing(skus, repo)  ← server-authoritative pricing engine
  ├─ reserveInventory(sku, qty)       ← synchronous, atomic in single process
  ├─ createRazorpayOrder(totalPaise)  ← Razorpay API via Basic Auth
  ├─ assert razorpayOrder.amount === totalPaise  ← integrity check
  └─ persist Order snapshot (immutable)
  │  returns: orderId + razorpayOrderId + razorpayKeyId + amount
  ▼
Razorpay Checkout (client-side modal)
  │  payment processed by Razorpay
  ▼
POST /api/checkout/verify (browser callback)
  ├─ verify order.razorpayOrderId === razorpayOrderId
  ├─ verifyPaymentSignature(HMAC-SHA256)
  ├─ idempotency: already PAID → return 200
  └─ transition order: PAYMENT_PENDING → PAID

POST /api/webhooks/razorpay (Razorpay server-to-server)
  ├─ verifyWebhookSignature(HMAC-SHA256)
  ├─ idempotency: already PAID → 200 no-op
  └─ transition order based on event type
```

---

## 2. Request Flow

| Step | Who | What | Trusted? |
|---|---|---|---|
| 1 | Client | SKU + quantity | Identifiers — yes; inventory checked server-side |
| 2 | Client | Customer info + address | Personal data — validated; not monetary |
| 3 | Client | Coupon code | Code only — validated server-side |
| 4 | Server | `computeOrderPricing` | Authoritative |
| 5 | Server | Razorpay order creation | `totalPaise` is server-calculated |
| 6 | Server | Amount assertion | `razorpayOrder.amount === totalPaise` |
| 7 | Client | Razorpay callback | `razorpay_signature` — HMAC verified |
| 8 | Server | `/api/checkout/verify` | Signature + order binding verified |
| 9 | Razorpay | Webhook | HMAC verified; idempotent |

---

## 3. Pricing Authority

The server is authoritative for all monetary values. The `/api/checkout/orders` route:
- Accepts only `{sku, quantity}` per line — no price, no subtotal, no discount
- Calls `computeOrderPricing` from `src/modules/checkout/pricing.ts`
- Passes only `totalPaise` (server-calculated) to `createRazorpayOrder`
- Asserts `razorpayOrder.amount === totalPaise` before persisting
- The returned payload to the client contains only identifiers and the amount (for Razorpay modal initialisation, not for re-use)

There is **no second path** in this codebase capable of creating a Razorpay order with a client-supplied amount. The only Razorpay order creation point is `src/lib/razorpay.ts:createRazorpayOrder`, called exclusively from `src/app/api/checkout/orders/route.ts`.

---

## 4. Order Creation

Orders are immutable snapshots. `Order.items[]` preserves:
- Product name, SKU, variant at time of purchase
- Server-read `unitPricePaise` (not re-read from catalogue later)
- `gstRateBp`, `hsnCode` for invoice

Changing the catalogue after order creation does NOT affect existing orders. This is the correct architecture; the production Supabase implementation must preserve this invariant (no FK to live product prices).

---

## 5. Razorpay Integration

| Component | Implementation | File |
|---|---|---|
| API client | Native `fetch` + Basic Auth | `src/lib/razorpay.ts` |
| Order creation | `createRazorpayOrder(amount, receipt, notes)` | same |
| Order fetch | `fetchRazorpayOrder(razorpayOrderId)` | same |
| Payment callback verify | HMAC-SHA256, timing-safe | `src/modules/payments/razorpay-security.ts` |
| Webhook verify | HMAC-SHA256, timing-safe | same |
| Amount check | `verifyPaymentAmount(received, expected)` | same |

Environment variables required:
- `RAZORPAY_KEY_ID` — public key (sent to client for modal init)
- `RAZORPAY_KEY_SECRET` — private key (never sent to client)
- `RAZORPAY_WEBHOOK_SECRET` — webhook HMAC secret (required in production)

---

## 6. Webhook Handling

Route: `POST /api/webhooks/razorpay`

1. Reads raw body as text (before JSON parse — required for HMAC)
2. Validates `x-razorpay-signature` header present
3. Verifies HMAC-SHA256: `HMAC(rawBody, RAZORPAY_WEBHOOK_SECRET)`
4. Parses JSON only after verification
5. Looks up order by `payload.payload.payment.entity.order_id`
6. Handles `payment.captured` and `payment.failed`
7. Always returns 200 after successful signature verification (prevents Razorpay retries for processing errors)
8. Unknown orders → 200 (ack, don't retry)

---

## 7. Idempotency

| Scenario | Handling |
|---|---|
| Browser callback + webhook both arrive | Both check `order.status === "PAID"` — whichever arrives second is a no-op |
| Duplicate `payment.captured` webhooks | `canTransition("PAID", "PAID")` returns false — not re-processed |
| Verify called twice with same valid signature | Returns `{ success: true, alreadyProcessed: true }` |
| Webhook for unknown order | Returns 200 without processing |

**Demo limitation:** Idempotency is per-process (in-memory Map). In production, use a DB UNIQUE constraint on `razorpay_payment_id`.

---

## 8. Payment State Machine

```
CREATED ──────────────────────────────────────── CANCELLED
   │
   ▼
PAYMENT_PENDING ◄─── PAYMENT_FAILED
   │           │
   │           └──── CANCELLED
   ▼
  PAID ─────────────────────────────────────────── REFUNDED
   │
   ▼
PROCESSING ──────────────────────────────────── REFUNDED
   │
   ▼
SHIPPED ─────────────────────────────────────── REFUNDED
   │
   ▼
DELIVERED ───────────────────────────────────── REFUNDED
```

Invalid transitions throw at runtime. Implemented in `src/modules/orders/state-machine.ts`.

---

## 9. Inventory Consistency

**Current status: SAFE for single-process demo; NOT SAFE for production auto-scaling.**

`reserveInventory(sku, qty)` is a synchronous check-and-decrement:
```typescript
const current = inv.get(sku);
if (current === undefined || current < quantity) return false;
inv.set(sku, current - quantity);  // no await between read and write
return true;
```

In Node.js's single-threaded event loop, no other request can interleave between these two lines. This makes it safe for one process.

**Production requirement:**
```sql
BEGIN;
SELECT stock FROM product_variants WHERE sku = $1 FOR UPDATE;
UPDATE product_variants SET stock = stock - $2
  WHERE sku = $1 AND stock >= $2
  RETURNING stock;
-- if 0 rows updated → ROLLBACK; return out-of-stock
COMMIT;
```
With Supabase: use `rpc('reserve_inventory', { p_sku, p_qty })` calling this stored procedure.

---

## 10. Coupon Consistency

Server-side validation in `src/modules/checkout/coupon.ts`:
- Status check (active/inactive/expired)
- Expiry date check
- Usage limit check  
- Minimum order check
- Product eligibility check
- Case-insensitive code normalisation

**Demo limitation:** Usage count is from seed data (static). Production must increment `usage_count` atomically in the DB within the order creation transaction.

---

## 11. Security Tests

| File | Tests | Status |
|---|---|---|
| `tests/unit/orders/state-machine.test.ts` | 26 | PASS |
| `tests/unit/orders/repository.test.ts` | 8 | PASS |
| `tests/unit/security/payment-integration.test.ts` | 27 | PASS |
| `tests/unit/security/checkout-pricing.test.ts` | 28 | PASS (Phase 2) |
| `tests/unit/security/razorpay-webhook.test.ts` | 22 | PASS (Phase 2) |
| `tests/unit/security/feed-token.test.ts` | 12 | PASS (Phase 2) |
| `tests/unit/security/admin-brute-force.test.ts` | 8 | PASS (Phase 2) |

**Total: 186 tests, all passing.**

Attack scenarios A–Z and AA tested or referenced — see `payment-integration.test.ts` for cross-references.

---

## 12. Remaining Risks

| Risk | Severity | Blocker? | Fix |
|---|---|---|---|
| Orders not persistent across restarts | CRITICAL | YES | Supabase/Drizzle order table |
| Inventory: not safe for multi-instance | CRITICAL | YES | DB row-level locking (see §9) |
| Coupon usage: not atomic | HIGH | YES | DB transaction in order creation |
| Webhook idempotency: per-process | HIGH | YES | DB UNIQUE on razorpay_payment_id |
| `RAZORPAY_KEY_ID`/`KEY_SECRET` not set | CRITICAL | YES | Required env vars |
| `RAZORPAY_WEBHOOK_SECRET` not set | CRITICAL | YES | Required; webhook returns 500 in prod if missing |
| No customer authentication | HIGH | YES | Customer session needed for IDOR prevention on order detail pages |
| No order-detail endpoint (no customer can check their own order) | MEDIUM | NO | Phase 3 |
| No refund flow implemented | LOW | NO | Phase 3 |

---

## Final Status

```
PAYMENT INTEGRATION: NOT READY
  — In-memory demo only. Requires persistent DB, Razorpay test credentials,
    and distributed inventory reservation before production use.

CHECKOUT: NOT READY
  — Architecture correct and complete. UI wired. All security primitives
    implemented and tested. Blocked by persistent storage requirement.

INVENTORY CONCURRENCY: NOT SAFE FOR PRODUCTION
  — Safe for single-process demo only. Requires DB transaction (see §9).

WEBHOOKS: ARCHITECTURE READY
  — HMAC verification, idempotency, state machine all implemented.
    Requires RAZORPAY_WEBHOOK_SECRET in production.

SECURITY SCORE: 7.5/10
  — Points added vs Phase 2: complete checkout architecture (+0.5),
    state machine (+0.5), inventory protection (+0.5).
  — Points withheld: no persistent DB, no customer auth, no 2FA.

PRODUCTION BLOCKERS:
  1. Supabase/Drizzle order repository (replaces DemoOrderRepository)
  2. Atomic inventory reservation via DB stored procedure
  3. Atomic coupon usage increment in order creation transaction
  4. Webhook idempotency via DB UNIQUE constraint on razorpay_payment_id
  5. RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET configured
  6. RAZORPAY_WEBHOOK_SECRET configured
  7. Customer authentication for order-detail access (IDOR prevention)
```
