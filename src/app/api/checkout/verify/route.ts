import { after, type NextRequest } from "next/server";

import { notifyOrderPaid } from "@/modules/notifications/order-paid";
import { verifyPaymentSignature } from "@/modules/payments/razorpay-security";
import { getOrderRepository } from "@/modules/orders/queries";
import { transitionOrder } from "@/modules/orders/state-machine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const orderId = b.orderId;
  const razorpayOrderId = b.razorpayOrderId;
  const razorpayPaymentId = b.razorpayPaymentId;
  const razorpaySignature = b.razorpaySignature;

  if (
    typeof orderId !== "string" || !orderId ||
    typeof razorpayOrderId !== "string" || !razorpayOrderId ||
    typeof razorpayPaymentId !== "string" || !razorpayPaymentId ||
    typeof razorpaySignature !== "string" || !razorpaySignature
  ) {
    return Response.json({ error: "Missing required payment verification fields." }, { status: 400 });
  }

  const orderRepo = getOrderRepository();
  const order = await orderRepo.findById(orderId);

  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  // Verify the Razorpay order ID belongs to this internal order.
  if (order.razorpayOrderId !== razorpayOrderId) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "checkout_security",
        action: "razorpay_order_id_mismatch",
        orderId,
        expectedRazorpayOrderId: order.razorpayOrderId,
        receivedRazorpayOrderId: razorpayOrderId,
        ts: new Date().toISOString(),
      }),
    );
    return Response.json({ error: "Invalid order reference." }, { status: 400 });
  }

  // Idempotency: if already PAID, return success without re-processing.
  if (order.status === "PAID") {
    return Response.json({ success: true, orderId, orderNumber: order.orderNumber ?? null, alreadyProcessed: true });
  }

  // Verify HMAC payment signature.
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keySecret) {
    return Response.json({ error: "Payment verification unavailable." }, { status: 500 });
  }

  const signatureValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret);

  if (!signatureValid) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "checkout_security",
        action: "payment_signature_invalid",
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        ts: new Date().toISOString(),
      }),
    );
    return Response.json({ error: "Invalid payment signature." }, { status: 400 });
  }

  // Guard: order must be in PAYMENT_PENDING to transition to PAID.
  if (order.status !== "PAYMENT_PENDING") {
    return Response.json({ error: "Order is not in a payable state." }, { status: 409 });
  }

  // Transition to PAID.
  let paid = transitionOrder(order, "PAID");
  paid = { ...paid, razorpayPaymentId };
  await orderRepo.update(paid);

  // Send after the response so the customer isn't kept waiting on the email provider.
  after(() => notifyOrderPaid(paid));

  console.log(
    JSON.stringify({
      level: "info",
      event: "checkout",
      action: "payment.verified",
      orderId,
      razorpayPaymentId,
      ts: new Date().toISOString(),
    }),
  );

  return Response.json({ success: true, orderId, orderNumber: paid.orderNumber ?? null });
}
