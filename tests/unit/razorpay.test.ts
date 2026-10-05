import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { GatewayError } from "@/modules/payments/gateway";
import { hmacSha256Hex, mapRazorpayPayment, RazorpayGateway, verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } from "@/modules/payments/razorpay";

const KEY_SECRET = "test_key_secret_123";
const WEBHOOK_SECRET = "test_webhook_secret_456";

describe("signatures", () => {
  it("accepts a correct checkout signature and rejects tampering", () => {
    const sig = createHmac("sha256", KEY_SECRET).update("order_abc|pay_xyz").digest("hex");
    expect(verifyRazorpayCheckoutSignature(KEY_SECRET, "order_abc", "pay_xyz", sig)).toBe(true);
    expect(verifyRazorpayCheckoutSignature(KEY_SECRET, "order_abc", "pay_other", sig)).toBe(false);
    expect(verifyRazorpayCheckoutSignature("wrong", "order_abc", "pay_xyz", sig)).toBe(false);
    expect(verifyRazorpayCheckoutSignature(KEY_SECRET, "order_abc", "pay_xyz", "not-hex")).toBe(false);
    expect(verifyRazorpayCheckoutSignature(KEY_SECRET, "order_abc", "pay_xyz", sig.slice(0, 10))).toBe(false);
  });

  it("verifies the webhook body byte-for-byte", () => {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", amount: 100 } } } });
    const sig = hmacSha256Hex(WEBHOOK_SECRET, body);
    expect(verifyRazorpayWebhookSignature(WEBHOOK_SECRET, body, sig)).toBe(true);
    expect(verifyRazorpayWebhookSignature(WEBHOOK_SECRET, body.replace("100", "101"), sig)).toBe(false);
  });
});

describe("gateway client", () => {
  it("creates orders with basic auth and auto-capture, and maps payments", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith("/orders")) return new Response(JSON.stringify({ id: "order_123" }), { status: 200 });
      if (String(url).includes("/payments/pay_1")) return new Response(JSON.stringify({ id: "pay_1", order_id: "order_123", amount: 5000, currency: "INR", status: "captured", method: "upi" }), { status: 200 });
      if (String(url).includes("/payments/pay_missing")) return new Response("{}", { status: 404 });
      return new Response("{}", { status: 500 });
    };
    const gw = new RazorpayGateway({ keyId: "rzp_test_key", keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET, fetchImpl });
    const order = await gw.createOrder({ amountPaise: 5000, currency: "INR", receipt: "KL-1", notes: { order_number: "KL-1" } });
    expect(order.providerOrderId).toBe("order_123");
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from(`rzp_test_key:${KEY_SECRET}`).toString("base64")}`);
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({ amount: 5000, currency: "INR", receipt: "KL-1", payment_capture: 1 });

    const payment = await gw.fetchPayment("pay_1");
    expect(payment).toMatchObject({ id: "pay_1", orderId: "order_123", amountPaise: 5000, status: "captured", method: "upi" });
    expect(await gw.fetchPayment("pay_missing")).toBeNull();
    expect(await gw.fetchPayment("bad id")).toBeNull();
    await expect(gw.createOrder({ amountPaise: 1, currency: "INR", receipt: "x", notes: {} }).catch((e: unknown) => e)).resolves.toBeInstanceOf(Object);
  });

  it("surfaces non-2xx responses as GatewayError", async () => {
    const gw = new RazorpayGateway({ keyId: "k", keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET, fetchImpl: async () => new Response("boom", { status: 502 }) });
    await expect(gw.createOrder({ amountPaise: 100, currency: "INR", receipt: "r", notes: {} })).rejects.toBeInstanceOf(GatewayError);
  });

  it("maps unknown statuses conservatively", () => {
    expect(mapRazorpayPayment({ id: "p", amount: 1, currency: "INR", status: "weird" }).status).toBe("created");
  });
});
