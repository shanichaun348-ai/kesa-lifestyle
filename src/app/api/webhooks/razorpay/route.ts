import { after, type NextRequest } from "next/server";

import { notifyOrderPaid } from "@/modules/notifications/order-paid";
import { getWebhookIdempotencyKey, verifyWebhookSignature } from "@/modules/payments/razorpay-security";
import { getOrderRepository } from "@/modules/orders/queries";
import { canTransition, transitionOrder } from "@/modules/orders/state-machine";

export const dynamic = "force-dynamic";

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
};

export async function POST(request: NextRequest): Promise<Response> {
  // Always return 200 after successful signature verification to prevent Razorpay retries.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return Response.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        JSON.stringify({
          level: "error",
          event: "webhook_config",
          message: "RAZORPAY_WEBHOOK_SECRET is not set in production — webhook processing blocked.",
          ts: new Date().toISOString(),
        }),
      );
      return Response.json({ error: "Webhook not configured." }, { status: 500 });
    }
    console.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification in development.");
  } else {
    const valid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "checkout_security",
          action: "webhook_signature_invalid",
          ts: new Date().toISOString(),
        }),
      );
      return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response(null, { status: 200 }); // malformed but signed — ack and ignore
  }

  const event = payload.event ?? "";
  const paymentEntity = payload.payload?.payment?.entity;
  const razorpayPaymentId = paymentEntity?.id ?? "";
  const razorpayOrderId = paymentEntity?.order_id ?? "";

  // Idempotency key uniquely identifies this payment event.
  const idempotencyKey = getWebhookIdempotencyKey(payload);

  const orderRepo = getOrderRepository();
  const order = razorpayOrderId ? await orderRepo.findByRazorpayOrderId(razorpayOrderId) : null;

  if (!order) {
    console.log(
      JSON.stringify({
        level: "info",
        event: "razorpay_webhook",
        action: "order_not_found",
        razorpayOrderId,
        eventType: event,
        ts: new Date().toISOString(),
      }),
    );
    return new Response(null, { status: 200 });
  }

  // Persistent idempotency check — prevents double-processing on Razorpay retries.
  // In production: DB INSERT ON CONFLICT with UNIQUE(idempotency_key).
  // In demo: in-memory Set (resets on restart, acceptable for development).
  // idempotencyKey may be null for non-payment events; fall back to event+paymentId.
  const resolvedKey: string = idempotencyKey ?? `${event}:${razorpayPaymentId}`;
  const shouldProcess = await orderRepo.recordWebhookEvent(resolvedKey, event, order.id);
  if (!shouldProcess) {
    console.log(
      JSON.stringify({
        level: "info",
        event: "razorpay_webhook",
        eventType: event,
        orderId: order.id,
        result: "duplicate_skipped",
        idempotencyKey,
        ts: new Date().toISOString(),
      }),
    );
    return new Response(null, { status: 200 });
  }

  try {
    switch (event) {
      case "payment.captured": {
        if (canTransition(order.status, "PAID")) {
          let updated = transitionOrder(order, "PAID");
          if (razorpayPaymentId) updated = { ...updated, razorpayPaymentId };
          await orderRepo.update(updated);
          // Only this path or the verify route performs the PAID transition, so the email goes out once.
          after(() => notifyOrderPaid(updated));
          console.log(
            JSON.stringify({
              level: "info",
              event: "razorpay_webhook",
              eventType: event,
              orderId: order.id,
              razorpayPaymentId,
              result: "paid",
              ts: new Date().toISOString(),
            }),
          );
        } else {
          console.warn(
            JSON.stringify({
              level: "warn",
              event: "razorpay_webhook",
              eventType: event,
              orderId: order.id,
              status: order.status,
              result: "invalid_transition",
              ts: new Date().toISOString(),
            }),
          );
        }
        break;
      }

      case "payment.failed": {
        if (canTransition(order.status, "PAYMENT_FAILED")) {
          const updated = transitionOrder(order, "PAYMENT_FAILED");
          await orderRepo.update(updated);
          console.log(
            JSON.stringify({
              level: "info",
              event: "razorpay_webhook",
              eventType: event,
              orderId: order.id,
              result: "payment_failed",
              ts: new Date().toISOString(),
            }),
          );
        }
        break;
      }

      default:
        console.log(
          JSON.stringify({
            level: "info",
            event: "razorpay_webhook",
            eventType: event,
            orderId: order.id,
            result: "unhandled",
            ts: new Date().toISOString(),
          }),
        );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "razorpay_webhook",
        eventType: event,
        orderId: order.id,
        error: err instanceof Error ? err.message : "unknown",
        ts: new Date().toISOString(),
      }),
    );
  }

  return new Response(null, { status: 200 });
}
