# Order Idempotency Design

**Problem:** A network error after the server processes a checkout request but before the client receives the response causes the client to retry — potentially creating a duplicate order.

---

## Mechanism: `Idempotency-Key` Header + SHA-256 Request Hash

### Client usage (optional)
```
POST /api/checkout/orders
Idempotency-Key: 7f3d2a1b-4e5c-6f7g-8h9i-0j1k2l3m4n5o
Content-Type: application/json

{ "lines": [...], "customer": {...}, "shippingAddress": {...} }
```

The `Idempotency-Key` is a client-generated UUID, unique per checkout attempt. It is optional: if not provided, no idempotency protection applies (behavior identical to the previous implementation).

### Server behavior
```
first call (key not seen):
  → create_order_with_inventory RPC
  → stores (key, orderId, requestHash) in checkout_idempotency_keys
  → processes normally
  → returns { orderId, razorpayOrderId, amount, ... }

retry (same key, same hash):
  → create_order_with_inventory RPC detects existing key
  → returns existing orderId
  → if order is PAYMENT_PENDING: return existing Razorpay data
  → if order is CREATED (Razorpay failed): return 503 "retry with new key"

tampered retry (same key, different hash):
  → create_order_with_inventory RPC detects hash mismatch
  → returns IDEMPOTENCY_CONFLICT
  → server returns 409
```

---

## Request Hash Computation

```typescript
// src/app/api/checkout/orders/route.ts
const requestHash = createHash("sha256")
  .update(JSON.stringify({ lines: rawLines, couponCode, total: pricing.totalPaise }))
  .digest("hex");
```

The hash covers the semantic content of the request: cart lines, coupon code, and the server-calculated total. If a client retries with the same idempotency key but different cart contents (e.g., quantity changed), the hash won't match and the server rejects it with 409.

---

## Storage: `checkout_idempotency_keys`

```sql
CREATE TABLE checkout_idempotency_keys (
  key TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

This table is inside the same PostgreSQL transaction as the order creation — it is written atomically with the `orders` insert. If the transaction rolls back (e.g., due to insufficient stock), the idempotency key is also rolled back, allowing the client to retry the same key after fixing the issue.

---

## Interaction with the Razorpay Boundary

The idempotency key is stored when `status = CREATED` (before Razorpay). If the server crashes after DB commit but before Razorpay:

1. Client retries with the same key
2. `create_order_with_inventory` detects the existing key → returns existing order
3. Order is still in `CREATED` (no `razorpay_order_id`)
4. Server returns 503 "Previous checkout attempt failed. Please retry."

The client must retry with a **new** idempotency key if the previous attempt failed at the Razorpay step. This is the simplest correct behavior: the order is orphaned (stuck in CREATED) and the reconciliation job will clean it up (see `CHECKOUT_TRANSACTION_BOUNDARY.md`).

A more advanced design would re-attempt Razorpay on the idempotent path, but this adds complexity and Razorpay already provides its own idempotency via the `receipt` field (`orderId` is used as the receipt).

---

## Scope and Lifetime

Idempotency keys are currently stored indefinitely. For a production system:
- Keys older than 24 hours can be cleaned up (checkout attempts don't span days)
- Add a Supabase cron job: `DELETE FROM checkout_idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours'`

---

## Demo Mode

`DemoOrderRepository.createWithInventory` ignores the idempotency key (`_idempotencyKey`, `_requestHash`). The demo has no persistent storage, so idempotency cannot be enforced across serverless function instances. This is acceptable for development — the demo is explicitly marked NOT FOR PRODUCTION.

---

## Summary

| Property | Guarantee |
|----------|-----------|
| Duplicate order creation | Prevented by UNIQUE on `checkout_idempotency_keys.key` |
| Tampered retry detection | SHA-256 hash of `{lines, couponCode, total}` must match |
| Inventory double-reservation | Prevented — idempotency check is inside the same DB transaction as inventory lock |
| Survives server crash | ✅ Key written atomically with order |
| Multi-instance safe | ✅ PostgreSQL UNIQUE constraint |
