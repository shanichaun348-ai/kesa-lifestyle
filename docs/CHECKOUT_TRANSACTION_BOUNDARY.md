# Checkout Transaction Boundary

**Decision:** The checkout flow spans two systems — PostgreSQL and Razorpay. These cannot share a single distributed transaction.

---

## The Boundary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL Transaction (atomic)                                        │
│                                                                         │
│  1. Check idempotency key (checkout_idempotency_keys)                  │
│  2. Lock product_variants rows FOR UPDATE                               │
│  3. Verify available_stock ≥ requested quantity for each SKU            │
│  4. Decrement available_stock, increment reserved_stock                 │
│  5. INSERT inventory_reservations                                       │
│  6. INSERT orders (status = CREATED, razorpay_order_id = NULL)         │
│  7. INSERT order_items (immutable snapshot)                             │
│  8. INSERT coupon_redemptions (if coupon used)                          │
│  9. INSERT checkout_idempotency_keys                                    │
│                                                                         │
│  All succeed or all fail.                                               │
└─────────────────────────────────────────────────────────────────────────┘
                     │ success
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Razorpay API Call (external — NOT in transaction)                      │
│                                                                         │
│  POST https://api.razorpay.com/v1/orders                                │
│  { amount: totalPaise, currency: "INR", receipt: orderId }              │
└─────────────────────────────────────────────────────────────────────────┘
                     │
           ┌─────────┴──────────┐
           │ Success            │ Failure
           ▼                    ▼
┌────────────────────┐  ┌────────────────────────────────────────────────┐
│ Update order:      │  │ Failure recovery:                              │
│  razorpay_order_id │  │  1. release_order_inventory RPC                │
│  status → PENDING  │  │     (restores available_stock, releases        │
└────────────────────┘  │      inventory_reservations)                   │
                        │  2. UPDATE orders SET status = 'CANCELLED'     │
                        │  3. Return 503 to client                       │
                        └────────────────────────────────────────────────┘
```

---

## Why This Boundary Exists

PostgreSQL and Razorpay cannot participate in a distributed two-phase commit. The options were:

1. **Create Razorpay order first, then DB** — If the DB insert fails after Razorpay, the Razorpay order exists with no record on our side. Harder to recover.

2. **Create DB record first, then Razorpay** ← **Chosen** — If Razorpay fails, we have the DB record and can explicitly cancel it and release inventory. Easier to recover and audit.

3. **Saga pattern** — Full compensating transactions. Correct but far beyond MVP scope.

---

## Failure Scenarios

| Step | Failure | Recovery |
|------|---------|----------|
| Steps 1–9 fail (DB error) | Transaction rolls back atomically | Client gets 503; no inventory consumed |
| Razorpay API returns 4xx | `release_order_inventory` + `status = CANCELLED` | Client gets 503; inventory freed |
| Razorpay API returns 5xx / timeout | Same as above | Client gets 503; safe to retry with new idempotency key |
| App server crashes between DB commit and Razorpay | Order stuck in `CREATED` status, inventory reserved | **Reconciliation job needed** (see below) |
| Amount integrity check fails | Same as Razorpay failure | Security event logged |
| DB fails during `UPDATE orders SET status = CANCELLED` | Order stuck in `CREATED`, inventory still reserved | Reconciliation job needed |

---

## Stuck Orders (CREATED status)

Orders in `CREATED` status with no `razorpay_order_id` after more than N minutes are orphaned. They hold inventory reservations that should be released.

**Required reconciliation job** (not yet implemented):
```sql
-- Find orders stuck in CREATED for > 15 minutes
SELECT id FROM orders
WHERE status = 'CREATED'
  AND razorpay_order_id IS NULL
  AND created_at < NOW() - INTERVAL '15 minutes';

-- For each: call release_order_inventory(order_id), then UPDATE status = 'CANCELLED'
```

This can be a Supabase cron job (`pg_cron`) or an external scheduler.

---

## Idempotency Key Behavior

The `Idempotency-Key` header is optional. When provided:

| Scenario | Result |
|----------|--------|
| New key | Normal flow |
| Seen key + same hash | Returns existing order (if `PAYMENT_PENDING`) or 503 (if `CREATED`) |
| Seen key + different hash | 409 — tampered retry detected |

After a successful `PAYMENT_PENDING` transition, retrying with the same key returns the existing Razorpay data — the client can re-open the payment modal without creating a duplicate order.

---

## Consistency Guarantee

After a successful `POST /api/checkout/orders` response:
- `orders` row exists with `status = PAYMENT_PENDING` and a valid `razorpay_order_id`
- `inventory_reservations` holds the reserved stock
- `available_stock` is decremented in `product_variants`
- The Razorpay order amount exactly matches `orders.total_paise` (verified server-side)

This is the strongest consistency guarantee achievable without a distributed transaction.
