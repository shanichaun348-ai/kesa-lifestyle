/**
 * Payment gateway contract (ADR-09). Razorpay is the only production
 * implementation; tests use an in-memory fake so the whole order lifecycle
 * can be exercised without network access or live keys.
 */

export type GatewayPaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";

export type GatewayPayment = {
  id: string;
  orderId: string | null;
  amountPaise: number;
  currency: string;
  status: GatewayPaymentStatus;
  method: string | null;
  /** Raw provider object, stored for forensics. */
  raw: unknown;
};

export type CreateGatewayOrderInput = {
  amountPaise: number;
  currency: "INR";
  /** Our order number; shows in the provider dashboard. */
  receipt: string;
  notes: Record<string, string>;
};

export interface PaymentGateway {
  readonly provider: "razorpay";
  /** Public key id for the hosted checkout; safe to send to the browser. */
  readonly publicKeyId: string;
  createOrder(input: CreateGatewayOrderInput): Promise<{ providerOrderId: string }>;
  /** Browser callback proof: HMAC over `order_id|payment_id` with the key secret. */
  verifyCheckoutSignature(input: { providerOrderId: string; providerPaymentId: string; signature: string }): boolean;
  /** Webhook proof: HMAC over the raw body with the webhook secret. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  fetchPayment(providerPaymentId: string): Promise<GatewayPayment | null>;
  fetchOrderPayments(providerOrderId: string): Promise<GatewayPayment[]>;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}
