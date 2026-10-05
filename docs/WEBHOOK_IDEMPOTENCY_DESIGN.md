# Webhook Idempotency Design

**Problem:** Razorpay retries webhook delivery until it receives a 2xx response. Without idempotency protection, a retry would trigger duplicate order state transitions.

---

## Mechanism: INSERT ON CONFLICT

The `record_webhook_event` stored procedure:

```sql
CREATE OR REPLACE FUNCTION record_webhook_event(
  p_idempotency_key TEXT,
  p_event_type TEXT,
  p_order_id TEXT
) RETURNS BOOLEAN
AS $$
DECLARE v_rows INT;
BEGIN
  WITH ins AS (
    INSERT INTO webhook_events (idempotency_key, event_type, order_id)
    VALUES (p_idempotency_key, p_event_type, p_order_id)
    ON CONFLICT (idempotency_key) DO NOTHING    -- ← idempotency gate
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_rows FROM ins;
  RETURN v_rows > 0;   -- TRUE = first time seen, FALSE = duplicate
END;
$$;
```

The `webhook_events.idempotency_key` column has a `UNIQUE` constraint. The INSERT either:
- **Succeeds (1 row)** → returns TRUE → caller processes the event
- **Conflicts (0 rows)** → returns FALSE → caller skips, returns 200 immediately

---

## Idempotency Key Construction

```typescript
// From src/modules/payments/razorpay-security.ts
export function getWebhookIdempotencyKey(payload: unknown): string {
  const p = payload as { event?: string; payload?: { payment?: { entity?: { id?: string } } } };
  const event = p.event ?? "unknown";
  const paymentId = p.payload?.payment?.entity?.id ?? "unknown";
  return `${event}:${paymentId}`;
}
// Example: "payment.captured:pay_PqZR8lmK5QqAbC"
```

The key is unique per payment event: same payment ID + same event type = same key.

---

## Request Flow

```
Razorpay → POST /api/webhooks/razorpay
  1. Read raw body (before JSON parse)
  2. Verify HMAC-SHA256 signature
  3. Parse body
  4. Find order by razorpay_order_id
  5. record_webhook_event(idempotencyKey, eventType, orderId)
     ├─ Returns TRUE  → process event (transition order state)
     └─ Returns FALSE → skip (log "duplicate_skipped"), return 200
  6. Always return 200 after HMAC passes (prevents Razorpay infinite retries)
```

---

## Concurrent Retry Race

Two Razorpay retries arrive simultaneously for the same payment:

```
Request A:                         Request B:
  record_webhook_event(key)          record_webhook_event(key)
  INSERT succeeds → TRUE             INSERT conflicts → FALSE
  Process event:                     Skip: return 200 immediately
    transitionOrder PAID
    orderRepo.update
  return 200
```

PostgreSQL's UNIQUE constraint ensures exactly one INSERT succeeds, regardless of concurrency. This is atomic — no application-level locking needed.

---

## What Happens if Processing Fails After Recording?

The idempotency record is written BEFORE processing. If processing fails:

1. The webhook event is in `webhook_events` as processed
2. The order state was NOT updated (the error was caught, 200 was returned)
3. Razorpay won't retry (it got a 200)
4. **Order is stuck in PAYMENT_PENDING** — needs manual resolution

**Mitigation:** Razorpay also provides a dashboard to manually trigger retries. For MVP, the `record_webhook_event` is called before processing but the "success" is not verified. A production system should use a two-phase pattern:
1. Record as `pending`
2. Process
3. Update to `processed`
4. If step 3 fails, retry locally

This adds complexity not warranted for MVP. The current design accepts the edge case.

---

## Demo vs Production

| Property | Demo (`DemoOrderRepository`) | Production (`SupabaseOrderRepository`) |
|----------|------------------------------|----------------------------------------|
| Storage | In-memory `Set<string>` | `webhook_events` table (persistent) |
| Survives restart | ❌ No | ✅ Yes |
| Concurrent-safe | ✅ (single process) | ✅ (DB UNIQUE constraint) |
| Multi-instance safe | ❌ No | ✅ Yes |

---

## `webhook_events` Table Schema

```sql
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,   -- gate
  provider TEXT NOT NULL DEFAULT 'razorpay',
  event_type TEXT NOT NULL,
  order_id TEXT,
  status TEXT NOT NULL DEFAULT 'processed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The `UNIQUE (idempotency_key)` constraint is the only enforcement mechanism needed.
