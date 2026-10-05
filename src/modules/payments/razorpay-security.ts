import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay security utilities — webhook signature verification and payment
 * callback verification.
 *
 * ─── Payment State Machine ────────────────────────────────────────────────
 *
 *   CREATED
 *     │  (Razorpay order created server-side with server-calculated amount)
 *     ▼
 *   PAYMENT_PENDING
 *     │  (Customer on Razorpay checkout — no server action yet)
 *     ▼
 *   ┌──────────┐        ┌─────────────────┐
 *   │  PAID    │        │ PAYMENT_FAILED   │
 *   └────┬─────┘        └────────┬────────┘
 *        │  (webhook: payment.captured)   │ (webhook: payment.failed)
 *        ▼                                ▼
 *   PROCESSING                    PAYMENT_FAILED (terminal)
 *        │  (order fulfillment)
 *        ▼
 *   SHIPPED
 *        │  (tracking updated)
 *        ▼
 *   DELIVERED (terminal, happy path)
 *
 *   REFUND_REQUESTED → REFUNDED (terminal, unhappy path from any post-PAID state)
 *   CANCELLED (terminal — cancelled before payment or by admin)
 *
 * ─── Security contract ───────────────────────────────────────────────────
 * 1. The Razorpay order is ALWAYS created server-side using the server-
 *    calculated totalPaise from computeOrderPricing() — NEVER from a
 *    client-supplied amount.
 * 2. Payment callbacks from the browser are NEVER trusted directly; the
 *    server verifies the HMAC signature before processing.
 * 3. Webhooks are verified with HMAC-SHA256 (this module). Duplicate and
 *    replayed webhooks are idempotent: check payment_id uniqueness in DB.
 * 4. The Razorpay order amount stored in DB must match the server-computed
 *    amount; a mismatch means the payment is rejected.
 *
 * Phase 2: wire these helpers into the checkout Server Action and the
 * /api/webhooks/razorpay route handler when Razorpay is integrated.
 */

// ── Webhook signature ─────────────────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature on an incoming Razorpay webhook.
 *
 * @param rawBody     The raw request body bytes (do NOT parse before calling).
 * @param signature   The value of the `x-razorpay-signature` header.
 * @param webhookSecret  The Razorpay webhook secret from the dashboard.
 * @returns true if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string, webhookSecret: string): boolean {
  if (!rawBody || !signature || !webhookSecret) return false;
  const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf-8") : rawBody;
  const expected = createHmac("sha256", webhookSecret).update(body).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf-8");
  const receivedBuf = Buffer.from(signature, "utf-8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

// ── Payment callback verification ────────────────────────────────────────

/**
 * Verify the payment signature sent in the Razorpay checkout callback.
 *
 * Razorpay signs the callback as:
 *   HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 *
 * @param orderId    razorpay_order_id from the callback
 * @param paymentId  razorpay_payment_id from the callback
 * @param signature  razorpay_signature from the callback
 * @param keySecret  Razorpay API key secret
 * @returns true if valid
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const payload = `${orderId}|${paymentId}`;
  const expected = createHmac("sha256", keySecret).update(payload, "utf-8").digest("hex");
  const expectedBuf = Buffer.from(expected, "utf-8");
  const receivedBuf = Buffer.from(signature, "utf-8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

// ── Amount integrity check ────────────────────────────────────────────────

/**
 * Verify that the amount in a Razorpay payment object matches the amount
 * this server recorded for that order.
 *
 * Call this after fetching the payment via the Razorpay API to prevent
 * a scenario where an attacker creates a separate Razorpay order for a
 * smaller amount and submits its payment ID against a larger order.
 *
 * @param razorpayAmountPaise  Amount from the Razorpay payment object (paise).
 * @param serverAmountPaise    Amount this server stored when creating the order.
 * @returns true if amounts match exactly.
 */
export function verifyPaymentAmount(razorpayAmountPaise: number, serverAmountPaise: number): boolean {
  return Number.isInteger(razorpayAmountPaise) && Number.isInteger(serverAmountPaise) && razorpayAmountPaise === serverAmountPaise;
}

// ── Idempotency key ───────────────────────────────────────────────────────

/**
 * Extract a stable idempotency key from a Razorpay webhook payload.
 * Use this as the deduplication key when writing the payment record to DB:
 *
 *   INSERT INTO payments (...) VALUES (...) ON CONFLICT (razorpay_payment_id) DO NOTHING
 *
 * This prevents duplicate webhook deliveries from crediting an order twice.
 */
export function getWebhookIdempotencyKey(payload: { payload?: { payment?: { entity?: { id?: string } } } }): string | null {
  return payload?.payload?.payment?.entity?.id ?? null;
}
