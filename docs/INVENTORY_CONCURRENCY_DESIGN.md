# Inventory Concurrency Design

**Problem:** Two concurrent requests for the last unit of a product must not both succeed.

---

## The Mechanism: PostgreSQL FOR UPDATE

The `create_order_with_inventory` stored procedure uses row-level locking:

```sql
-- Inside create_order_with_inventory (runs in a PostgreSQL transaction)

-- Step 1: Lock ALL product_variant rows needed by this order.
-- FOR UPDATE prevents any other transaction from reading or modifying
-- these rows until this transaction commits or rolls back.
FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
LOOP
  SELECT available_stock INTO v_available
  FROM product_variants
  WHERE sku = v_sku
  FOR UPDATE;                          -- ← acquires exclusive row lock

  IF v_available < v_quantity THEN
    RETURN '{"ok":false,"error":"INSUFFICIENT_STOCK",...}';
    -- Transaction rolls back; lock released
  END IF;
END LOOP;

-- Step 2: Decrement (only reached if ALL locks acquired and stock sufficient)
UPDATE product_variants
SET available_stock = available_stock - v_quantity, ...
WHERE sku = v_sku;

-- Step 3: COMMIT → all locks released atomically
```

---

## Concurrent Request Example

Two requests arrive simultaneously for the last unit of SKU `ring-gold-m`.

```
Time →

Request A:                          Request B:
  BEGIN                               BEGIN
  SELECT ... FOR UPDATE ──────────────┐
  (A acquires lock on ring-gold-m)    │ SELECT ... FOR UPDATE
                                      │ (B blocks — row locked by A)
  available_stock = 1 ✓               │
  UPDATE SET available = 0            │
  INSERT order + items                │
  COMMIT ──────────────────────────── │ (A releases lock)
                                      │
                                      ▼ B gets lock
                                      available_stock = 0
                                      ← v_available < v_quantity
                                      RETURN INSUFFICIENT_STOCK
                                      ROLLBACK
```

**Outcome:** Request A gets the unit. Request B receives a `409 Out of Stock` response. No oversell.

---

## Why Demo Mode Is NOT Safe for Production

`DemoOrderRepository.createWithInventory` uses synchronous JavaScript:

```typescript
// Single-threaded: no other code runs between these two lines
const available = inv.get(item.sku); // read
inv.set(item.sku, available - item.quantity); // write
```

This is safe **only** because Node.js has a single-threaded event loop — no other synchronous code can interleave. It is **not safe** when:
- Running multiple Vercel serverless function instances (each has its own `Map`)
- Running multiple Node.js processes (PM2 cluster mode)
- Any horizontally-scaled deployment

The PostgreSQL FOR UPDATE approach is safe in all deployment configurations.

---

## Invariants Enforced at Multiple Layers

| Layer | Mechanism |
|-------|-----------|
| PostgreSQL CHECK | `available_stock >= 0` — prevents negative stock even if code is buggy |
| Stored procedure logic | Returns error before decrement if `available < quantity` |
| Application layer | `createWithInventory` returns `out_of_stock` result instead of throwing |
| HTTP response | 409 Conflict with clear error message to the client |

---

## Deadlock Prevention

The stored procedure processes items in the order they appear in `p_items`. To prevent deadlocks when two requests reserve overlapping SKUs in different orders, the application should sort the `items` array by SKU before passing to the RPC. This is not currently enforced but should be added before the product catalog grows large enough that multi-SKU orders become common.

---

## Stock Release on Failure

When a Razorpay order creation fails after the DB transaction commits, the app calls `release_order_inventory(orderId)`:

```sql
-- Atomically restores stock
UPDATE product_variants
SET
  available_stock = available_stock + ir.quantity,
  reserved_stock = GREATEST(0, reserved_stock - ir.quantity)
FROM inventory_reservations ir
WHERE ir.order_id = p_order_id AND ir.status = 'reserved' AND pv.sku = ir.sku;

UPDATE inventory_reservations
SET status = 'released'
WHERE order_id = p_order_id AND status = 'reserved';
```

The `GREATEST(0, ...)` guard prevents `reserved_stock` going negative if called twice (idempotent).

---

## Current Limitations

1. **No deadlock handling** — SKUs not sorted before locking. Low risk today with single-item cart typical behavior.
2. **No lock timeout** — if the DB is slow, the request waits indefinitely. Add `lock_timeout = '5s'` if needed.
3. **No abandoned reservation cleanup** — orders stuck in `CREATED` hold stock indefinitely. Needs the reconciliation job described in `CHECKOUT_TRANSACTION_BOUNDARY.md`.
