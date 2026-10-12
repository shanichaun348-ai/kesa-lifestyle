import { createHash, randomUUID } from "node:crypto";
import { after, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { markCartConverted } from "@/modules/abandoned-cart/store";
import { CART_COOKIE } from "@/modules/abandoned-cart/types";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { codAvailability, isPaymentMethod, type PaymentMethod } from "@/modules/checkout/cod";
import { computeOrderPricing } from "@/modules/checkout/pricing";
import { notifyOrderPaid } from "@/modules/notifications/order-paid";
import type { Order, OrderItem } from "@/modules/orders/types";
import { getOrderRepository } from "@/modules/orders/queries";
import { transitionOrder } from "@/modules/orders/state-machine";
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/razorpay";
import { verifyPaymentAmount } from "@/modules/payments/razorpay-security";

export const dynamic = "force-dynamic";

// ── Input validation helpers ─────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^\d{6}$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

type ValidationResult = { ok: true } | { ok: false; message: string };

function validateBody(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) return { ok: false, message: "Invalid request body." };
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.lines) || b.lines.length === 0) return { ok: false, message: "Cart is empty." };
  for (const line of b.lines) {
    if (typeof line !== "object" || line === null) return { ok: false, message: "Invalid cart line." };
    const l = line as Record<string, unknown>;
    if (!isNonEmptyString(l.sku)) return { ok: false, message: "Each cart line must have a SKU." };
    if (!Number.isInteger(l.quantity) || (l.quantity as number) < 1) return { ok: false, message: "Invalid quantity." };
  }

  if (b.paymentMethod !== undefined && !isPaymentMethod(b.paymentMethod)) return { ok: false, message: "Unknown payment method." };

  const c = b.customer as Record<string, unknown> | undefined;
  if (!c || typeof c !== "object") return { ok: false, message: "Customer details are required." };
  if (!isNonEmptyString(c.name)) return { ok: false, message: "Customer name is required." };
  if (!isNonEmptyString(c.email) || !EMAIL_RE.test((c.email as string).trim())) return { ok: false, message: "Valid email is required." };
  if (!isNonEmptyString(c.phone) || !PHONE_RE.test((c.phone as string).trim())) return { ok: false, message: "Valid 10-digit Indian mobile number is required." };

  const a = b.shippingAddress as Record<string, unknown> | undefined;
  if (!a || typeof a !== "object") return { ok: false, message: "Shipping address is required." };
  if (!isNonEmptyString(a.name)) return { ok: false, message: "Recipient name is required." };
  if (!isNonEmptyString(a.phone)) return { ok: false, message: "Address phone is required." };
  if (!isNonEmptyString(a.line1)) return { ok: false, message: "Address line 1 is required." };
  if (!isNonEmptyString(a.city)) return { ok: false, message: "City is required." };
  if (!isNonEmptyString(a.state)) return { ok: false, message: "State is required." };
  if (!isNonEmptyString(a.pincode) || !PINCODE_RE.test((a.pincode as string).trim())) return { ok: false, message: "Valid 6-digit pincode is required." };

  return { ok: true };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  // Optional idempotency key from client — enables safe retries on network errors.
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validation = validateBody(body);
  if (!validation.ok) return Response.json({ error: validation.message }, { status: 400 });

  const b = body as Record<string, unknown>;
  const rawLines = b.lines as Array<{ sku: string; quantity: number }>;
  const couponCode = typeof b.couponCode === "string" ? b.couponCode : undefined;
  const paymentMethod: PaymentMethod = isPaymentMethod(b.paymentMethod) ? b.paymentMethod : "razorpay";
  const customerRaw = b.customer as Record<string, string>;
  const addrRaw = b.shippingAddress as Record<string, string>;

  // Signed-in customers fall back to their account email, which is what links the order to their history.
  const sessionUser = await getSessionUser();
  const customer = {
    name: (customerRaw.name ?? "").trim(),
    email: ((customerRaw.email ?? "").trim() || sessionUser?.email || "").toLowerCase(),
    phone: (customerRaw.phone ?? "").trim(),
  };

  const shippingAddress = {
    name: (addrRaw.name ?? "").trim(),
    phone: (addrRaw.phone ?? "").trim(),
    line1: (addrRaw.line1 ?? "").trim(),
    ...(isNonEmptyString(addrRaw.line2) && { line2: addrRaw.line2.trim() }),
    city: (addrRaw.city ?? "").trim(),
    state: (addrRaw.state ?? "").trim(),
    pincode: (addrRaw.pincode ?? "").trim(),
    country: "India",
  };

  // ── 1. Server-side pricing ────────────────────────────────────────────────
  const pricingOutcome = await computeOrderPricing(
    { lines: rawLines, ...(couponCode && { couponCode }), ...(customer.email && { customerEmail: customer.email }) },
    getCatalogRepository(),
  );

  if (!pricingOutcome.ok) {
    const { message, code, sku } = pricingOutcome.error;
    // `sku` lets the checkout point at the offending bag line instead of echoing the code.
    return Response.json({ error: message, code, ...(sku && { sku }) }, { status: 422 });
  }

  const pricing = pricingOutcome.result;

  // COD eligibility and fee come from server-side pricing, never from the client.
  let codFeePaise = 0;
  if (paymentMethod === "cod") {
    const cod = codAvailability(pricing.subtotalPaise - pricing.discountPaise);
    if (!cod.allowed) return Response.json({ error: cod.reason, code: "COD_UNAVAILABLE" }, { status: 422 });
    codFeePaise = cod.feePaise;
  }
  const totalPaise = pricing.totalPaise + codFeePaise;

  // ── 2. Build immutable order snapshot ────────────────────────────────────
  const now = new Date().toISOString();
  const orderId = `ord_${randomUUID().replace(/-/g, "")}`;

  const items: OrderItem[] = pricing.lines.map((l) => ({
    sku: l.sku,
    productId: l.productId,
    productName: l.productName,
    ...(l.variantOptionValue !== undefined && { variantOptionValue: l.variantOptionValue }),
    quantity: l.quantity,
    unitPricePaise: l.unitPricePaise,
    lineTotalPaise: l.lineTotalPaise,
    gstRateBp: l.gstRateBp,
    hsnCode: l.hsnCode,
  }));

  const order: Order = {
    id: orderId,
    status: "CREATED",
    customer,
    shippingAddress,
    items,
    subtotalPaise: pricing.subtotalPaise,
    discountPaise: pricing.discountPaise,
    shippingPaise: pricing.shippingPaise,
    gstPaise: pricing.gstPaise,
    totalPaise,
    coupon: pricing.coupon,
    paymentMethod,
    codFeePaise,
    razorpayOrderId: "", // assigned after Razorpay order creation below; stays empty for COD
    currency: "INR",
    createdAt: now,
    updatedAt: now,
  };

  // Request hash allows idempotency check to detect tampered retries.
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ lines: rawLines, couponCode, paymentMethod, total: totalPaise }))
    .digest("hex");

  // ── 3. Atomically reserve inventory + persist order snapshot ─────────────
  // Production: single PostgreSQL transaction via create_order_with_inventory RPC.
  // Demo: synchronous check-and-decrement (safe in single-process Node.js only).
  const orderRepo = getOrderRepository();
  const createResult = await orderRepo.createWithInventory(order, idempotencyKey, requestHash);

  switch (createResult.kind) {
    case "out_of_stock":
      return Response.json(
        { error: `"${createResult.sku}" is no longer available in the requested quantity.`, sku: createResult.sku },
        { status: 409 },
      );
    case "product_not_found":
      return Response.json({ error: `Product "${createResult.sku}" not found.`, code: "PRODUCT_NOT_FOUND", sku: createResult.sku }, { status: 422 });
    case "idempotency_conflict":
      return Response.json({ error: "Duplicate request with different content." }, { status: 409 });
    case "idempotent": {
      // Same idempotency key seen before — return existing order data if usable.
      const existing = createResult.order;
      if (existing.paymentMethod === "cod" && existing.status === "PROCESSING") {
        return Response.json({ orderId: existing.id, orderNumber: existing.orderNumber ?? null, paymentMethod: "cod" as const, amount: existing.totalPaise });
      }
      if (existing.status === "PAYMENT_PENDING" && existing.razorpayOrderId) {
        return Response.json({
          orderId: existing.id,
          paymentMethod: "razorpay" as const,
          razorpayOrderId: existing.razorpayOrderId,
          razorpayKeyId: getRazorpayKeyId(),
          amount: existing.totalPaise,
          currency: "INR" as const,
        });
      }
      // Previous attempt failed at the payment step — client should retry with a new key.
      return Response.json(
        { error: "Previous checkout attempt failed. Please retry." },
        { status: 503 },
      );
    }
  }

  // The RPC persists the snapshot with its own defaults; carry the payment fields forward
  // so the update below writes them.
  const createdOrder: Order = { ...createResult.order, paymentMethod, codFeePaise };

  // The saved bag (cookie-identified) has converted: stop any reminder for it.
  const cartToken = request.cookies.get(CART_COOKIE)?.value;
  if (cartToken && /^[a-f0-9]{32}$/.test(cartToken)) after(() => markCartConverted(cartToken, orderId));

  // ── 4a. Cash on delivery: nothing to collect now — confirm and start fulfilment ──
  if (paymentMethod === "cod") {
    const processing = transitionOrder(createdOrder, "PROCESSING");
    await orderRepo.update(processing);

    // Same confirmation the verify route sends once an online payment lands.
    after(() => notifyOrderPaid(processing));

    console.log(
      JSON.stringify({
        level: "info",
        event: "checkout",
        action: "order.created",
        orderId,
        paymentMethod: "cod",
        amount: totalPaise,
        codFeePaise,
        ts: now,
      }),
    );

    return Response.json({ orderId, orderNumber: processing.orderNumber ?? null, paymentMethod: "cod" as const, amount: totalPaise });
  }

  // ── 4b. Create Razorpay order (external — outside DB transaction) ─────────
  let razorpayOrder: { id: string; amount: number; currency: string };
  try {
    razorpayOrder = await createRazorpayOrder(totalPaise, orderId, {
      internal_order_id: orderId,
      customer_email: customer.email,
    });
  } catch {
    // Release reserved inventory and cancel the order snapshot.
    await orderRepo.releaseOrderInventory(orderId);
    await orderRepo.update(
      transitionOrder({ ...createdOrder, updatedAt: new Date().toISOString() }, "CANCELLED"),
    );
    return Response.json({ error: "Payment service unavailable. Please try again." }, { status: 503 });
  }

  // ── 5. Amount integrity assertion ─────────────────────────────────────────
  if (!verifyPaymentAmount(razorpayOrder.amount, totalPaise)) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "checkout_security",
        action: "razorpay_amount_mismatch",
        orderId,
        expected: totalPaise,
        received: razorpayOrder.amount,
        ts: now,
      }),
    );
    await orderRepo.releaseOrderInventory(orderId);
    await orderRepo.update(
      transitionOrder({ ...createdOrder, updatedAt: new Date().toISOString() }, "CANCELLED"),
    );
    return Response.json({ error: "Internal pricing error. Please try again." }, { status: 500 });
  }

  // ── 6. Assign razorpayOrderId and transition to PAYMENT_PENDING ───────────
  const pending = transitionOrder(
    { ...createdOrder, razorpayOrderId: razorpayOrder.id },
    "PAYMENT_PENDING",
  );
  await orderRepo.update(pending);

  console.log(
    JSON.stringify({
      level: "info",
      event: "checkout",
      action: "order.created",
      orderId,
      paymentMethod: "razorpay",
      razorpayOrderId: razorpayOrder.id,
      amount: totalPaise,
      ts: now,
    }),
  );

  // Return only what the client needs to open the Razorpay checkout modal.
  return Response.json({
    orderId,
    paymentMethod: "razorpay" as const,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: getRazorpayKeyId(),
    amount: totalPaise,
    currency: "INR" as const,
  });
}
