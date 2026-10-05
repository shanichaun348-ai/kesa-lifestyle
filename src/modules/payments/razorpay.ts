import { createHmac, timingSafeEqual } from "node:crypto";

import { GatewayError, type CreateGatewayOrderInput, type GatewayPayment, type GatewayPaymentStatus, type PaymentGateway } from "./gateway";

/**
 * Razorpay gateway (docs/03 §6, docs/11 §7). Uses the REST API directly:
 * one fewer dependency, and every request is visible here.
 */

export function hmacSha256Hex(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Razorpay Checkout success callback: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyRazorpayCheckoutSignature(keySecret: string, providerOrderId: string, providerPaymentId: string, signature: string): boolean {
  return safeEqualHex(hmacSha256Hex(keySecret, `${providerOrderId}|${providerPaymentId}`), signature);
}

/** Razorpay webhook: HMAC_SHA256(raw body, webhook_secret) in `X-Razorpay-Signature`. */
export function verifyRazorpayWebhookSignature(webhookSecret: string, rawBody: string, signature: string): boolean {
  return safeEqualHex(hmacSha256Hex(webhookSecret, rawBody), signature);
}

type RazorpayPaymentEntity = {
  id: string;
  order_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
};

function mapStatus(status: string): GatewayPaymentStatus {
  switch (status) {
    case "captured":
      return "captured";
    case "authorized":
      return "authorized";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    default:
      return "created";
  }
}

export function mapRazorpayPayment(entity: RazorpayPaymentEntity): GatewayPayment {
  return {
    id: entity.id,
    orderId: entity.order_id ?? null,
    amountPaise: entity.amount,
    currency: entity.currency,
    status: mapStatus(entity.status),
    method: entity.method ?? null,
    raw: entity,
  };
}

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  baseUrl?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
};

export class RazorpayGateway implements PaymentGateway {
  readonly provider = "razorpay" as const;
  readonly publicKeyId: string;
  private readonly baseUrl: string;
  private readonly auth: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: RazorpayConfig) {
    this.publicKeyId = config.keyId;
    this.baseUrl = config.baseUrl ?? "https://api.razorpay.com/v1";
    this.auth = `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: this.auth, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new GatewayError(`Razorpay ${init?.method ?? "GET"} ${path} failed: ${res.status} ${text.slice(0, 200)}`, res.status);
    }
    return (await res.json()) as T;
  }

  async createOrder(input: CreateGatewayOrderInput): Promise<{ providerOrderId: string }> {
    const body = { amount: input.amountPaise, currency: input.currency, receipt: input.receipt, notes: input.notes, payment_capture: 1 };
    const order = await this.request<{ id: string }>("/orders", { method: "POST", body: JSON.stringify(body) });
    return { providerOrderId: order.id };
  }

  verifyCheckoutSignature(input: { providerOrderId: string; providerPaymentId: string; signature: string }): boolean {
    return verifyRazorpayCheckoutSignature(this.config.keySecret, input.providerOrderId, input.providerPaymentId, input.signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return verifyRazorpayWebhookSignature(this.config.webhookSecret, rawBody, signature);
  }

  async fetchPayment(providerPaymentId: string): Promise<GatewayPayment | null> {
    if (!/^pay_[A-Za-z0-9]+$/.test(providerPaymentId)) return null;
    try {
      return mapRazorpayPayment(await this.request<RazorpayPaymentEntity>(`/payments/${providerPaymentId}`));
    } catch (error) {
      if (error instanceof GatewayError && error.status === 404) return null;
      throw error;
    }
  }

  async fetchOrderPayments(providerOrderId: string): Promise<GatewayPayment[]> {
    if (!/^order_[A-Za-z0-9]+$/.test(providerOrderId)) return [];
    const data = await this.request<{ items: RazorpayPaymentEntity[] }>(`/orders/${providerOrderId}/payments`);
    return data.items.map(mapRazorpayPayment);
  }
}
