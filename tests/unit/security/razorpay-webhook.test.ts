/**
 * Security: Razorpay webhook and payment signature verification tests.
 *
 * Tests cover:
 *   - Valid webhook HMAC-SHA256 signature
 *   - Tampered webhook body (signature mismatch)
 *   - Wrong webhook secret
 *   - Missing/empty inputs
 *   - Valid payment callback signature
 *   - Tampered payment callback
 *   - Amount integrity check
 *   - Idempotency key extraction
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  getWebhookIdempotencyKey,
  verifyPaymentAmount,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/modules/payments/razorpay-security";

const WEBHOOK_SECRET = "test-webhook-secret-xyz";
const KEY_SECRET = "test-razorpay-key-secret";

function makeWebhookSig(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf-8").digest("hex");
}

// ── verifyWebhookSignature ────────────────────────────────────────────────────

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_001", amount: 99900 } } } });

  it("accepts a valid signature", () => {
    const sig = makeWebhookSig(body, WEBHOOK_SECRET);
    expect(verifyWebhookSignature(body, sig, WEBHOOK_SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = makeWebhookSig(body, WEBHOOK_SECRET);
    const tampered = body.replace("payment.captured", "payment.captured_tampered");
    expect(verifyWebhookSignature(tampered, sig, WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const sig = makeWebhookSig(body, WEBHOOK_SECRET);
    expect(verifyWebhookSignature(body, sig, "wrong-secret")).toBe(false);
  });

  it("rejects an empty signature", () => {
    expect(verifyWebhookSignature(body, "", WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects an empty body", () => {
    const sig = makeWebhookSig(body, WEBHOOK_SECRET);
    expect(verifyWebhookSignature("", sig, WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects an empty secret", () => {
    const sig = makeWebhookSig(body, WEBHOOK_SECRET);
    expect(verifyWebhookSignature(body, sig, "")).toBe(false);
  });

  it("accepts Buffer body", () => {
    const buf = Buffer.from(body, "utf-8");
    const sig = makeWebhookSig(body, WEBHOOK_SECRET);
    expect(verifyWebhookSignature(buf, sig, WEBHOOK_SECRET)).toBe(true);
  });

  it("rejects a replay with a different payload but same length", () => {
    const body2 = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_002", amount: 99900 } } } });
    const sig1 = makeWebhookSig(body, WEBHOOK_SECRET);
    // sig1 was computed from body, not body2
    expect(verifyWebhookSignature(body2, sig1, WEBHOOK_SECRET)).toBe(false);
  });
});

// ── verifyPaymentSignature ────────────────────────────────────────────────────

describe("verifyPaymentSignature", () => {
  const orderId = "order_ABCD1234";
  const paymentId = "pay_XYZ9876";

  function makePaymentSig(oId: string, pId: string, secret: string): string {
    return createHmac("sha256", secret).update(`${oId}|${pId}`, "utf-8").digest("hex");
  }

  it("accepts a valid payment callback signature", () => {
    const sig = makePaymentSig(orderId, paymentId, KEY_SECRET);
    expect(verifyPaymentSignature(orderId, paymentId, sig, KEY_SECRET)).toBe(true);
  });

  it("rejects a tampered orderId", () => {
    const sig = makePaymentSig(orderId, paymentId, KEY_SECRET);
    expect(verifyPaymentSignature("order_TAMPERED", paymentId, sig, KEY_SECRET)).toBe(false);
  });

  it("rejects a tampered paymentId", () => {
    const sig = makePaymentSig(orderId, paymentId, KEY_SECRET);
    expect(verifyPaymentSignature(orderId, "pay_TAMPERED", sig, KEY_SECRET)).toBe(false);
  });

  it("rejects a wrong signature", () => {
    expect(verifyPaymentSignature(orderId, paymentId, "invalidsig", KEY_SECRET)).toBe(false);
  });

  it("rejects empty inputs", () => {
    const sig = makePaymentSig(orderId, paymentId, KEY_SECRET);
    expect(verifyPaymentSignature("", paymentId, sig, KEY_SECRET)).toBe(false);
    expect(verifyPaymentSignature(orderId, "", sig, KEY_SECRET)).toBe(false);
    expect(verifyPaymentSignature(orderId, paymentId, "", KEY_SECRET)).toBe(false);
    expect(verifyPaymentSignature(orderId, paymentId, sig, "")).toBe(false);
  });

  it("cannot replay a payment from a different order", () => {
    const sig = makePaymentSig("order_OTHER", paymentId, KEY_SECRET);
    expect(verifyPaymentSignature(orderId, paymentId, sig, KEY_SECRET)).toBe(false);
  });
});

// ── verifyPaymentAmount ───────────────────────────────────────────────────────

describe("verifyPaymentAmount", () => {
  it("accepts matching amounts", () => {
    expect(verifyPaymentAmount(99900, 99900)).toBe(true);
  });

  it("rejects a lower amount (underpayment attack)", () => {
    expect(verifyPaymentAmount(100, 99900)).toBe(false);
  });

  it("rejects amount = 0", () => {
    expect(verifyPaymentAmount(0, 99900)).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(verifyPaymentAmount(-1, 99900)).toBe(false);
  });

  it("rejects a higher amount than expected", () => {
    // A payment for more than expected is also a mismatch (replay from different order).
    expect(verifyPaymentAmount(999900, 99900)).toBe(false);
  });

  it("rejects non-integer amounts", () => {
    expect(verifyPaymentAmount(99900.5, 99900)).toBe(false);
  });
});

// ── getWebhookIdempotencyKey ─────────────────────────────────────────────────

describe("getWebhookIdempotencyKey", () => {
  it("extracts the payment id from a well-formed payload", () => {
    const payload = { payload: { payment: { entity: { id: "pay_001" } } } };
    expect(getWebhookIdempotencyKey(payload)).toBe("pay_001");
  });

  it("returns null for a malformed payload", () => {
    expect(getWebhookIdempotencyKey({})).toBeNull();
    expect(getWebhookIdempotencyKey({ payload: {} })).toBeNull();
    expect(getWebhookIdempotencyKey({ payload: { payment: {} } })).toBeNull();
  });
});
