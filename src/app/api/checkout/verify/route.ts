import { after, type NextRequest } from "next/server";

import { captureRazorpayPayment, fetchRazorpayPayment, type RazorpayPayment } from "@/lib/razorpay";
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

  // The signature proves the browser saw a Razorpay success screen; the money is confirmed
  // with Razorpay itself: the payment must belong to this order, be for the full amount,
  // and be captured (an authorised-only payment is captured here, since the order was
  // created with payment_capture).
  let payment: RazorpayPayment;
  try {
    payment = await fetchRazorpayPayment(razorpayPaymentId);
    if (payment.order_id === razorpayOrderId && payment.amount === order.totalPaise && payment.status === "authorized") {
      payment = await captureRazorpayPayment(razorpayPaymentId, order.totalPaise);
    }
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "checkout", action: "payment_lookup_failed", orderId, razorpayPaymentId, error: err instanceof Error ? err.message : "unknown", ts: new Date().toISOString() }));
    // The webhook or the stale-order job will settle it; tell the browser to wait rather than fail the order.
    return Response.json({ error: "Payment is being confirmed. Please check your order status in a moment." }, { status: 503 });
  }
  if (payment.order_id !== razorpayOrderId || payment.amount !== order.totalPaise || payment.status !== "captured") {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "checkout_security",
        action: "payment_not_captured_for_order",
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        paymentOrderId: payment.order_id,
        paymentAmount: payment.amount,
        paymentStatus: payment.status,
        expectedAmount: order.totalPaise,
        ts: new Date().toISOString(),
      }),
    );
    return Response.json({ error: "Payment could not be confirmed for this order." }, { status: 402 });
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
