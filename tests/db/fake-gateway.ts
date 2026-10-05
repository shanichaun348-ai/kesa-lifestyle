import { GatewayError, type CreateGatewayOrderInput, type GatewayPayment, type PaymentGateway } from "@/modules/payments/gateway";
import { hmacSha256Hex, verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } from "@/modules/payments/razorpay";

/**
 * In-memory stand-in for Razorpay used by the checkout flow tests. It uses
 * the real signature algorithms, so the verification code under test is the
 * production code; only the network is simulated.
 */
export class FakeGateway implements PaymentGateway {
  readonly provider = "razorpay" as const;
  readonly publicKeyId = "rzp_test_fake";
  readonly keySecret = "fake_key_secret";
  readonly webhookSecret = "fake_webhook_secret";
  readonly orders = new Map<string, CreateGatewayOrderInput>();
  readonly payments = new Map<string, GatewayPayment>();
  failNextCreate = false;
  private counter = 0;

  async createOrder(input: CreateGatewayOrderInput): Promise<{ providerOrderId: string }> {
    if (this.failNextCreate) {
      this.failNextCreate = false;
      throw new GatewayError("simulated gateway outage", 503);
    }
    const id = `order_fake${++this.counter}`;
    this.orders.set(id, input);
    return { providerOrderId: id };
  }

  verifyCheckoutSignature(input: { providerOrderId: string; providerPaymentId: string; signature: string }): boolean {
    return verifyRazorpayCheckoutSignature(this.keySecret, input.providerOrderId, input.providerPaymentId, input.signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return verifyRazorpayWebhookSignature(this.webhookSecret, rawBody, signature);
  }

  async fetchPayment(id: string): Promise<GatewayPayment | null> {
    return this.payments.get(id) ?? null;
  }

  async fetchOrderPayments(orderId: string): Promise<GatewayPayment[]> {
    return [...this.payments.values()].filter((p) => p.orderId === orderId);
  }

  /* ----------------------------------------------------------- simulators */

  /** The customer paid: creates a captured payment for the provider order. */
  capture(providerOrderId: string, amountOverride?: number): GatewayPayment {
    const order = this.orders.get(providerOrderId);
    const payment: GatewayPayment = {
      id: `pay_fake${++this.counter}`,
      orderId: providerOrderId,
      amountPaise: amountOverride ?? order?.amountPaise ?? 0,
      currency: "INR",
      status: "captured",
      method: "upi",
      raw: { simulated: true },
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  fail(providerOrderId: string): GatewayPayment {
    const order = this.orders.get(providerOrderId);
    const payment: GatewayPayment = { id: `pay_fake${++this.counter}`, orderId: providerOrderId, amountPaise: order?.amountPaise ?? 0, currency: "INR", status: "failed", method: "upi", raw: { simulated: true } };
    this.payments.set(payment.id, payment);
    return payment;
  }

  signCheckout(providerOrderId: string, providerPaymentId: string): string {
    return hmacSha256Hex(this.keySecret, `${providerOrderId}|${providerPaymentId}`);
  }

  /** Build a Razorpay-shaped webhook delivery for a payment. */
  webhook(event: "payment.captured" | "payment.failed" | "order.paid", payment: GatewayPayment, eventId = `evt_${++this.counter}`, notes: Record<string, string> = {}) {
    const body = {
      entity: "event",
      event,
      payload: { payment: { entity: { id: payment.id, order_id: payment.orderId, amount: payment.amountPaise, currency: payment.currency, status: payment.status, method: payment.method, notes } } },
    };
    const rawBody = JSON.stringify(body);
    return { eventId, rawBody, signature: hmacSha256Hex(this.webhookSecret, rawBody) };
  }
}
