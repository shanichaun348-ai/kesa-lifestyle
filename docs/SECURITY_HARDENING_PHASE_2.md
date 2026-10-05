# Security Hardening — Phase 2

**Date:** 2026-10-06
**Scope:** Cart Price Authority · Razorpay Security · Feed Token · Rate Limiter · Regression Tests
**Auditor:** Claude Sonnet 4.6 (security-engineering role)

---

## Summary

Phase 2 completes the server-side pricing authority requirement and establishes the security primitives needed before Razorpay is wired into production. All server-authoritative price computation, coupon validation, shipping calculation, and Razorpay HMAC verification is implemented and test-covered.

---

## Findings & Fixes

### 1. Cart Price Authority

| | |
|---|---|
| **Severity** | CRITICAL |
| **Status** | Fixed |
| **Finding** | The storefront used a localStorage-only cart. There was no server-side price validation path. A production Razorpay integration without this would allow a client to submit any amount. |
| **Fix** | Created `src/modules/checkout/pricing.ts` — a `server-only` pricing engine. The function `computeOrderPricing(input, repo)` accepts only `{ sku, quantity }` per line (trusted identifiers). All monetary values are computed server-side from catalog data. |
| **Test** | `tests/unit/security/checkout-pricing.test.ts` — 28 tests covering all attack scenarios |
| **Remaining Risk** | Pricing engine is implemented and tested. It is NOT yet wired to a checkout Server Action or Razorpay because those do not exist on this branch. **Checkout and payment are not live.** |

**Attack scenarios tested:**

| Scenario | Expectation | Result |
|---|---|---|
| Quantity = 0 | INVALID_QUANTITY | PASS |
| Quantity = -1 | INVALID_QUANTITY | PASS |
| Quantity = 1.5 (float) | INVALID_QUANTITY | PASS |
| Quantity = 999 (> MAX_QUANTITY_PER_LINE=10) | INVALID_QUANTITY | PASS |
| Quantity > stock | OUT_OF_STOCK | PASS |
| Unknown SKU | PRODUCT_NOT_FOUND | PASS |
| Archived product SKU | PRODUCT_NOT_ACTIVE | PASS |
| SKU with stock=0 | OUT_OF_STOCK | PASS |
| Price read from server, not client | unitPricePaise matches DB | PASS |
| Multi-quantity line total | pricePaise × quantity | PASS |
| Empty cart | EMPTY_CART | PASS |
| Non-existent coupon | COUPON_NOT_FOUND | PASS |
| Expired coupon | COUPON_EXPIRED | PASS |
| Inactive coupon | COUPON_INACTIVE | PASS |
| Coupon usage limit exhausted | COUPON_USAGE_LIMIT_REACHED | PASS |
| Coupon min-order not met | COUPON_MIN_ORDER_NOT_MET | PASS |
| Fixed coupon applied correctly | discountPaise = coupon.value | PASS |
| Percent coupon applied correctly | discountPaise = floor(subtotal × pct / 100) | PASS |
| Case-insensitive coupon code | "flat200" matches "FLAT200" | PASS |
| Empty coupon string → no coupon | coupon=null, discount=0 | PASS |
| Shipping charged below ₹999 threshold | shippingPaise > 0 | PASS |
| Free shipping at exactly ₹999 | shippingPaise = 0 | PASS |
| Free shipping above ₹999 | shippingPaise = 0 | PASS |
| Total = subtotal - discount + shipping | Invariant holds | PASS |
| GST is inclusive (gstPaise < subtotal) | gstPaise < subtotalPaise | PASS |

**What the server-side engine enforces:**
- Unit price: read from `variant.pricePaise` in catalog (never from client)
- Discount: computed from server-read coupon value applied to server-calculated subtotal
- Shipping: `₹59` flat / free on orders ≥ `₹999` (post-discount)
- GST: inclusive in price — `gstPaise` is the breakdown component for invoice display only, not an additional charge
- `totalPaise` is the ONLY amount that may be passed to Razorpay

---

### 2. CatalogRepository SKU Lookup

| | |
|---|---|
| **Severity** | HIGH (prerequisite for pricing engine) |
| **Status** | Fixed |
| **Finding** | `CatalogRepository` had no `getProductsBySku` method — only slug-based lookup. The pricing engine requires SKU → Product+Variant resolution. |
| **Fix** | Added `getProductsBySku(skus: string[]): Promise<Map<string, { product: Product; variant: ProductVariant }>>` to `CatalogRepository` interface. Implemented in `DemoCatalogRepository` via a linear scan of `activeProducts()`. |
| **Remaining Risk** | The demo scan is O(products × variants). Phase 2 Postgres implementation must use a DB index on `variant.sku` for O(log n) lookup. |

---

### 3. Razorpay Security Primitives

| | |
|---|---|
| **Severity** | CRITICAL (blocks payment launch) |
| **Status** | Implemented — not yet wired (Razorpay not on main branch) |
| **Finding** | No webhook signature verification, no payment callback verification, no amount integrity check existed. |
| **Fix** | Created `src/modules/payments/razorpay-security.ts` with: `verifyWebhookSignature`, `verifyPaymentSignature`, `verifyPaymentAmount`, `getWebhookIdempotencyKey`. All use `node:crypto` HMAC-SHA256 with timing-safe comparison. |
| **Test** | `tests/unit/security/razorpay-webhook.test.ts` — 22 tests |
| **Remaining Risk** | These primitives must be wired into the checkout Server Action and `/api/webhooks/razorpay` route handler before Razorpay goes live. See the Payment State Machine in the module header. |

**Security properties tested:**

| Scenario | Expectation | Result |
|---|---|---|
| Valid webhook HMAC | returns true | PASS |
| Tampered webhook body | returns false | PASS |
| Wrong webhook secret | returns false | PASS |
| Empty body / sig / secret | returns false | PASS |
| Buffer body input | returns true | PASS |
| Replay with different payload | returns false | PASS |
| Valid payment callback sig | returns true | PASS |
| Tampered orderId | returns false | PASS |
| Tampered paymentId | returns false | PASS |
| Wrong signature | returns false | PASS |
| Empty inputs | returns false | PASS |
| Cross-order payment replay | returns false | PASS |
| Amount match | returns true | PASS |
| Underpayment (amount=100 vs 99900) | returns false | PASS |
| Amount = 0 | returns false | PASS |
| Negative amount | returns false | PASS |
| Float amount | returns false | PASS |
| Idempotency key extraction | payment id returned | PASS |
| Malformed payload | returns null | PASS |

---

### 4. Google Shopping Feed — Production Token Enforcement

| | |
|---|---|
| **Severity** | HIGH |
| **Status** | Fixed |
| **Finding** | When `FEED_TOKEN` was not set, the feed was served without any authentication in all environments, including production. |
| **Fix** | Added production enforcement block in `src/app/api/feed/google-shopping/route.ts`. In production (`NODE_ENV === "production"`), if `FEED_TOKEN` is absent, the route returns HTTP 503 and logs a structured actionable error. The feed is NOT silently exposed. In development, the existing behaviour (no token required) continues. |
| **Test** | `tests/unit/security/feed-token.test.ts` — 12 tests covering production/dev gate logic and timing-safe comparison |
| **Remaining Risk** | None — fail-safe behaviour is verified. Operator must set `FEED_TOKEN` before deploying to production. |

---

### 5. Rate Limiter Documentation

| | |
|---|---|
| **Severity** | MEDIUM (informational) |
| **Status** | Documented |
| **Finding** | The rate limiter lacked documented coverage of its limitations, failure mode, and the Phase 2 migration requirement. |
| **Fix** | Added comprehensive JSDoc to `src/modules/admin/rate-limit.ts` documenting: what it protects, current limits (10 attempts / 15 min window), fail-closed behaviour, multi-instance (serverless) limitation, and explicit Phase 2 migration note. |
| **Phase 2 Migration Note** | Before production launch, replace with a Redis / Vercel KV-backed distributed rate limiter. The public interface (`isRateLimited` / `recordFailedAttempt`) does not change. |
| **Remaining Risk** | In a multi-instance serverless deployment (e.g. Vercel), each instance has its own counter. The effective per-IP limit is `MAX_ATTEMPTS × instance_count`. For the current demo/staging deployment this is acceptable; it must be replaced before high-traffic launch. |

---

### 6. Security Regression Tests

| | |
|---|---|
| **Severity** | N/A |
| **Status** | Complete |

New test files:

| File | Tests | Coverage |
|---|---|---|
| `tests/unit/security/admin-brute-force.test.ts` | 8 | Rate limiter logic, isolation, window, exports |
| `tests/unit/security/checkout-pricing.test.ts` | 28 | All cart/pricing/coupon attack scenarios |
| `tests/unit/security/razorpay-webhook.test.ts` | 22 | Webhook/payment HMAC, amount integrity, idempotency |
| `tests/unit/security/feed-token.test.ts` | 12 | Feed token gate logic, timing-safe comparison |

Total new tests: **70** | Total suite: **117 passed, 0 failed**

---

## Verification Results

| Check | Result |
|---|---|
| `tsc --noEmit` | PASS (0 errors) |
| `vitest run` | PASS (117/117) |
| `eslint` (new/changed files) | PASS (0 warnings) |
| `next build` | PASS |

---

## Remaining Risks (Non-Blocking for Current State)

| Risk | Severity | When to Fix |
|---|---|---|
| Rate limiter is in-memory / per-instance | MEDIUM | Before production with auto-scaling |
| Razorpay primitives not wired to a route | CRITICAL | When Razorpay is integrated |
| Checkout Server Action does not exist yet | CRITICAL | When checkout goes live |
| No Supabase RLS verification (no DB connected) | HIGH | When Supabase is integrated |
| No customer IDOR tests (no customer auth module) | HIGH | When customer accounts are built |
| `__Host-` cookie prefix not used (admin cookie uses `__Secure-`) | LOW | When admin path moves to `/` |
| TOTP 2FA for admin (docs/11_SECURITY_REQUIREMENTS.md) | HIGH | Phase 3 |

---

## Security Score

**SECURITY SCORE: 6.5/10**

Points earned: robust session auth (+2), CSP/security headers (+1), rate limiting (+1), server-side pricing engine (+1), Razorpay primitives (+0.5), feed token enforcement (+0.5), regression tests (+0.5), audit logging (+0.5). Points withheld: no DB/RLS (+0), no customer auth (+0), no 2FA (+0), in-memory rate limiter (+0).

---

## Production Blockers

- **Razorpay not wired:** `verifyWebhookSignature`, `verifyPaymentSignature`, `verifyPaymentAmount` must be called in the checkout Server Action and webhook route before Razorpay goes live.
- **Rate limiter is per-instance:** Must be replaced with a distributed implementation before auto-scaling deployment.
- **`FEED_TOKEN` must be set** in the production environment before deploying — the route will return 503 without it.

## Non-Blocking

- Customer IDOR tests (no customer auth module exists yet)
- Supabase RLS audit (no database connected)
- Admin TOTP 2FA (planned Phase 3)

---

## PAYMENT READY: NO

Server-side price authority is completely implemented and tested. Razorpay security primitives are implemented and tested. However, **there is no Razorpay integration on this branch, no checkout Server Action, and no webhook route**. Payment is not ready until those are wired and the `computeOrderPricing` + `verifyWebhookSignature` primitives are called in production code.

## CHECKOUT READY: NO

The checkout page is a "coming soon" placeholder. Server-side pricing is the security prerequisite — it is done. The checkout flow itself (address collection, Razorpay order creation, payment verification, order persistence) is Phase 3 work.
