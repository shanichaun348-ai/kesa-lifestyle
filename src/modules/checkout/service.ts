/**
 * Checkout and payment lifecycle (docs/08 §5–§8, docs/11 §7, ADR-27).
 *
 * Guarantees:
 * - Every amount is computed on the server from the catalogue and settings.
 * - Placing an order, reserving stock and recording it is one transaction;
 *   stock is reserved with a conditional UPDATE so two checkouts cannot both
 *   take the last unit.
 * - Placement is idempotent on the client-generated idempotency key.
 * - An order becomes `paid` only through `markOrderPaid`, which is reached
 *   from a verified webhook, a verified callback that is then confirmed
 *   against the gateway API, or the reconciliation job. It is idempotent.
 * - Late captures after cancellation are reinstated when stock allows,
 *   otherwise flagged for refund. Nothing is ever silently dropped.
 */
import { and, eq, inArray, lt, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { isUniqueViolation, type Db, type Tx } from "@/db/types";
import { loadCartLines, loadCouponInput, type LoadedLine } from "@/modules/cart/service";
import type { GatewayPayment, PaymentGateway } from "@/modules/payments/gateway";
import { codAllowed, priceCart, type PaymentMethod, type PricingResult, type ShippingMethod } from "@/modules/pricing/engine";
import { loadStoreSettings } from "@/modules/settings/store-settings";

export type CheckoutErrorCode =
  | "not_configured"
  | "cart_empty"
  | "cart_unavailable"
  | "insufficient_stock"
  | "coupon_invalid"
  | "cod_not_allowed"
  | "payment_unavailable"
  | "invalid_signature"
  | "order_not_found"
  | "invalid_state";

export class CheckoutError extends Error {
  constructor(
    readonly code: CheckoutErrorCode,
    message: string,
    readonly details: { sku?: string } = {},
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export type AddressInput = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | undefined;
  landmark?: string | undefined;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  country?: string | undefined;
};

export type PlaceOrderInput = {
  cartId: string;
  profileId: string | null;
  idempotencyKey: string;
  contact: { email: string; phone: string };
  shippingAddress: AddressInput;
  billingAddress?: AddressInput | undefined;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  giftWrap: boolean;
  giftMessage?: string | undefined;
  pincodeCodAvailable?: boolean | null | undefined;
  utm?: Record<string, string> | undefined;
  gaClientId?: string | undefined;
  ipHash?: string | undefined;
  userAgent?: string | undefined;
};

export type PlaceOrderResult = {
  orderId: string;
  orderNumber: string;
  status: (typeof schema.orderStatusEnum.enumValues)[number];
  totalPaise: number;
  created: boolean;
  payment: { provider: "razorpay"; providerOrderId: string; amountPaise: number; keyId: string } | null;
};

export type MarkPaidInput = {
  orderId: string;
  providerPaymentId: string;
  providerOrderId: string | null;
  amountPaise: number;
  method: string | null;
  raw: unknown;
  source: "webhook" | "callback" | "reconciliation";
};

export type MarkPaidResult = { changed: boolean; outcome: "paid" | "already_paid" | "reinstated" | "amount_mismatch" | "refund_required" | "ignored" };

export type WebhookInput = { eventId: string; rawBody: string; signature: string };
export type WebhookResult = { ok: boolean; status: number; outcome: string };

export type CheckoutDeps = {
  db: Db;
  gateway: PaymentGateway | null;
  now?: (() => Date) | undefined;
  reservationMinutes?: number | undefined;
};

type RazorpayWebhookBody = {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id?: string | null; amount: number; currency: string; status: string; method?: string | null; notes?: Record<string, string> } } };
};

async function defaultLocationId(tx: Tx): Promise<string> {
  const [loc] = await tx.select({ id: schema.locations.id }).from(schema.locations).where(and(eq(schema.locations.isDefault, true), eq(schema.locations.isActive, true))).limit(1);
  if (!loc) throw new CheckoutError("not_configured", "No active default stock location is configured.");
  return loc.id;
}

/** Conditionally reserve stock; returns false when fewer than `quantity` are available. */
async function reserve(tx: Tx, variantId: string, locationId: string, quantity: number): Promise<boolean> {
  const updated = await tx
    .update(schema.inventory)
    .set({ reserved: sql`${schema.inventory.reserved} + ${quantity}` })
    .where(and(eq(schema.inventory.variantId, variantId), eq(schema.inventory.locationId, locationId), sql`${schema.inventory.onHand} - ${schema.inventory.reserved} >= ${quantity}`))
    .returning({ variantId: schema.inventory.variantId });
  return updated.length > 0;
}

async function releaseReservations(tx: Tx, orderId: string): Promise<void> {
  const active = await tx.select().from(schema.inventoryReservations).where(and(eq(schema.inventoryReservations.orderId, orderId), eq(schema.inventoryReservations.status, "active")));
  for (const r of active) {
    await tx
      .update(schema.inventory)
      .set({ reserved: sql`greatest(${schema.inventory.reserved} - ${r.quantity}, 0)` })
      .where(and(eq(schema.inventory.variantId, r.variantId), eq(schema.inventory.locationId, r.locationId)));
    await tx.update(schema.inventoryReservations).set({ status: "released" }).where(eq(schema.inventoryReservations.id, r.id));
  }
}

/** Turn active reservations into sold stock: reserved goes down, the ledger takes the units. */
async function consumeReservations(tx: Tx, orderId: string): Promise<void> {
  const active = await tx.select().from(schema.inventoryReservations).where(and(eq(schema.inventoryReservations.orderId, orderId), eq(schema.inventoryReservations.status, "active")));
  for (const r of active) {
    await tx
      .update(schema.inventory)
      .set({ reserved: sql`greatest(${schema.inventory.reserved} - ${r.quantity}, 0)` })
      .where(and(eq(schema.inventory.variantId, r.variantId), eq(schema.inventory.locationId, r.locationId)));
    await tx.insert(schema.inventoryTransactions).values({ variantId: r.variantId, locationId: r.locationId, delta: -r.quantity, reason: "sale", referenceType: "order", referenceId: orderId });
    await tx.update(schema.inventoryReservations).set({ status: "consumed" }).where(eq(schema.inventoryReservations.id, r.id));
  }
}

async function addEvent(tx: Tx, orderId: string, type: string, data: unknown = null, actorType: "system" | "customer" | "admin" = "system") {
  await tx.insert(schema.orderEvents).values({ orderId, type, data, actorType });
}

async function enqueue(tx: Tx, type: string, payload: Record<string, unknown>) {
  await tx.insert(schema.outboxEvents).values({ type, payload });
}

export function createCheckoutService(deps: CheckoutDeps) {
  const { db, gateway } = deps;
  const now = deps.now ?? (() => new Date());
  const reservationMs = (deps.reservationMinutes ?? 10) * 60_000;

  async function loadResult(orderId: string, created: boolean): Promise<PlaceOrderResult> {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
    if (!order) throw new CheckoutError("order_not_found", "Order not found.");
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.provider, "razorpay")))
      .orderBy(sql`${schema.payments.createdAt} desc`)
      .limit(1);
    const paymentInfo =
      order.paymentMethod === "razorpay" && payment?.providerOrderId && gateway && order.status === "pending_payment"
        ? { provider: "razorpay" as const, providerOrderId: payment.providerOrderId, amountPaise: order.totalPaise, keyId: gateway.publicKeyId }
        : null;
    return { orderId: order.id, orderNumber: order.orderNumber, status: order.status, totalPaise: order.totalPaise, created, payment: paymentInfo };
  }

  async function cancelOrder(orderId: string, reason: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
      if (!order) return false;
      if (!["pending_payment", "payment_failed", "cod_pending"].includes(order.status)) return false;
      await releaseReservations(tx, orderId);
      await tx.update(schema.orders).set({ status: "cancelled", cancelledAt: now().toISOString(), cancelReason: reason }).where(eq(schema.orders.id, orderId));
      await addEvent(tx, orderId, "order_cancelled", { reason });
      await enqueue(tx, "order_cancelled", { orderId, reason });
      return true;
    });
  }

  async function markOrderPaid(input: MarkPaidInput): Promise<MarkPaidResult> {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, input.orderId)).for("update");
      if (!order) throw new CheckoutError("order_not_found", "Order not found.");

      // Record the payment attempt first (idempotent on provider payment id).
      await tx
        .insert(schema.payments)
        .values({
          orderId: order.id,
          provider: "razorpay",
          providerOrderId: input.providerOrderId,
          providerPaymentId: input.providerPaymentId,
          amountPaise: input.amountPaise,
          status: "captured",
          method: input.method,
          raw: input.raw,
        })
        .onConflictDoUpdate({
          target: [schema.payments.provider, schema.payments.providerPaymentId],
          targetWhere: sql`${schema.payments.providerPaymentId} is not null`,
          set: { status: "captured", raw: input.raw, amountPaise: input.amountPaise },
        });

      if (order.paymentStatus === "paid") return { changed: false, outcome: "already_paid" };

      if (input.amountPaise !== order.totalPaise) {
        await tx.update(schema.orders).set({ needsReview: true }).where(eq(schema.orders.id, order.id));
        await addEvent(tx, order.id, "payment_amount_mismatch", { expected: order.totalPaise, received: input.amountPaise, providerPaymentId: input.providerPaymentId, source: input.source });
        await enqueue(tx, "order_needs_review", { orderId: order.id, reason: "amount_mismatch" });
        return { changed: true, outcome: "amount_mismatch" };
      }

      let reinstated = false;
      if (order.status === "cancelled") {
        // Late capture: try to take the stock again; otherwise the money must go back.
        const locationId = await defaultLocationId(tx);
        const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
        let ok = true;
        for (const item of items) {
          if (!item.variantId) continue;
          if (!(await reserve(tx, item.variantId, locationId, item.quantity))) {
            ok = false;
            break;
          }
          await tx.insert(schema.inventoryReservations).values({ variantId: item.variantId, locationId, quantity: item.quantity, orderId: order.id, expiresAt: new Date(now().getTime() + reservationMs).toISOString() });
        }
        if (!ok) {
          await releaseReservations(tx, order.id);
          await tx.update(schema.orders).set({ needsReview: true }).where(eq(schema.orders.id, order.id));
          await addEvent(tx, order.id, "late_capture_unfulfillable", { providerPaymentId: input.providerPaymentId });
          await enqueue(tx, "refund_required", { orderId: order.id, providerPaymentId: input.providerPaymentId, amountPaise: input.amountPaise });
          return { changed: true, outcome: "refund_required" };
        }
        reinstated = true;
      } else if (!["pending_payment", "payment_failed"].includes(order.status)) {
        return { changed: false, outcome: "ignored" };
      }

      await consumeReservations(tx, order.id);
      await tx
        .update(schema.orders)
        .set({ status: "paid", paymentStatus: "paid", paidAt: now().toISOString(), cancelledAt: null, cancelReason: null })
        .where(eq(schema.orders.id, order.id));

      if (order.couponCodeId) {
        const [code] = await tx.select({ couponId: schema.couponCodes.couponId }).from(schema.couponCodes).where(eq(schema.couponCodes.id, order.couponCodeId)).limit(1);
        if (code) {
          await tx
            .insert(schema.couponRedemptions)
            .values({ couponId: code.couponId, codeId: order.couponCodeId, orderId: order.id, profileId: order.profileId, amountPaise: order.discountPaise })
            .onConflictDoNothing();
        }
      }
      if (order.cartToken) await tx.update(schema.carts).set({ status: "converted" }).where(eq(schema.carts.token, order.cartToken));
      if (order.profileId) {
        await tx
          .update(schema.profiles)
          .set({ ordersCount: sql`${schema.profiles.ordersCount} + 1`, totalSpentPaise: sql`${schema.profiles.totalSpentPaise} + ${order.totalPaise}`, lastOrderAt: now().toISOString() })
          .where(eq(schema.profiles.id, order.profileId));
      }
      await addEvent(tx, order.id, reinstated ? "order_reinstated_and_paid" : "order_paid", { providerPaymentId: input.providerPaymentId, source: input.source });
      await enqueue(tx, "order_paid", { orderId: order.id });
      return { changed: true, outcome: reinstated ? "reinstated" : "paid" };
    });
  }

  async function recordPaymentFailure(input: { orderId: string; providerPaymentId: string; providerOrderId: string | null; amountPaise: number; raw: unknown }): Promise<void> {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, input.orderId)).for("update");
      if (!order) return;
      await tx
        .insert(schema.payments)
        .values({ orderId: order.id, provider: "razorpay", providerOrderId: input.providerOrderId, providerPaymentId: input.providerPaymentId, amountPaise: input.amountPaise, status: "failed", raw: input.raw })
        .onConflictDoNothing();
      if (order.status === "pending_payment") {
        await tx.update(schema.orders).set({ status: "payment_failed", paymentStatus: "failed" }).where(eq(schema.orders.id, order.id));
      }
      await addEvent(tx, order.id, "payment_failed", { providerPaymentId: input.providerPaymentId });
    });
  }

  async function findOrderIdForPayment(providerOrderId: string | null, notes: Record<string, string> | undefined): Promise<string | null> {
    if (providerOrderId) {
      const [p] = await db.select({ orderId: schema.payments.orderId }).from(schema.payments).where(and(eq(schema.payments.provider, "razorpay"), eq(schema.payments.providerOrderId, providerOrderId))).limit(1);
      if (p) return p.orderId;
    }
    const orderNumber = notes?.order_number;
    if (orderNumber) {
      const [o] = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.orderNumber, orderNumber)).limit(1);
      if (o) return o.id;
    }
    return null;
  }

  return {
    cancelOrder,
    markOrderPaid,
    recordPaymentFailure,

    async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
      const [existing] = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existing) return loadResult(existing.id, false);

      let orderId: string;
      let orderNumber: string;
      let pricing: PricingResult;
      let cartToken: string | null = null;
      try {
        ({ orderId, orderNumber, pricing, cartToken } = await db.transaction(async (tx) => {
          const [cart] = await tx.select().from(schema.carts).where(eq(schema.carts.id, input.cartId)).for("update");
          if (!cart || cart.status !== "active") throw new CheckoutError("cart_empty", "Your bag is empty.");
          const settings = await loadStoreSettings(tx);
          const lines: LoadedLine[] = await loadCartLines(tx, cart.id, now());
          if (lines.length === 0) throw new CheckoutError("cart_empty", "Your bag is empty.");
          const blocked = lines.find((l) => l.view.issue !== null);
          if (blocked) {
            throw new CheckoutError(
              blocked.view.issue === "unavailable" ? "cart_unavailable" : "insufficient_stock",
              blocked.view.issue === "unavailable" ? `${blocked.view.productName} is no longer available.` : `Only ${blocked.view.available} of ${blocked.view.productName} left.`,
              { sku: blocked.view.sku },
            );
          }

          const coupon = cart.couponCodeId ? await loadCouponInput(tx, cart.couponCodeId, input.profileId) : null;
          const priced = priceCart({
            lines: lines.map((l) => l.input),
            coupon,
            shippingMethod: input.shippingMethod,
            destinationStateCode: input.shippingAddress.stateCode,
            paymentMethod: input.paymentMethod,
            giftWrap: input.giftWrap,
            settings,
            now: now(),
          });
          if (priced.coupon && !priced.coupon.applied) throw new CheckoutError("coupon_invalid", "The coupon on your bag is no longer valid. Remove it to continue.");
          if (input.paymentMethod === "cod") {
            const cod = codAllowed(priced, settings, input.pincodeCodAvailable ?? null);
            if (!cod.allowed) throw new CheckoutError("cod_not_allowed", cod.reason ?? "Cash on delivery is not available.");
          }
          if (!gateway && input.paymentMethod === "razorpay") throw new CheckoutError("payment_unavailable", "Online payment is not available right now.");

          const locationId = await defaultLocationId(tx);
          for (const line of lines) {
            if (!(await reserve(tx, line.variantId, locationId, line.input.quantity))) {
              throw new CheckoutError("insufficient_stock", `${line.view.productName} just sold out at that quantity.`, { sku: line.view.sku });
            }
          }

          const [order] = await tx
            .insert(schema.orders)
            .values({
              profileId: input.profileId,
              guestEmail: input.contact.email,
              guestPhone: input.contact.phone,
              status: input.paymentMethod === "cod" ? "cod_pending" : "pending_payment",
              paymentStatus: input.paymentMethod === "cod" ? "cod_pending" : "pending",
              paymentMethod: input.paymentMethod,
              subtotalPaise: priced.subtotalPaise,
              discountPaise: priced.discountPaise,
              shippingPaise: priced.shippingPaise,
              codFeePaise: priced.codFeePaise,
              giftWrapPaise: priced.giftWrapPaise,
              taxPaise: priced.taxPaise,
              totalPaise: priced.totalPaise,
              couponCodeId: priced.coupon?.applied && coupon ? coupon.codeId : null,
              discountSnapshot: priced.coupon ?? null,
              shippingMethod: input.shippingMethod,
              cartToken: cart.token,
              utm: input.utm ?? null,
              gaClientId: input.gaClientId ?? null,
              ipHash: input.ipHash ?? null,
              userAgent: input.userAgent ?? null,
              idempotencyKey: input.idempotencyKey,
              giftWrap: input.giftWrap,
              giftMessage: input.giftMessage ?? null,
              // Service clock, not the DB default, so reconciliation windows are consistent.
              placedAt: now().toISOString(),
            })
            .returning({ id: schema.orders.id, orderNumber: schema.orders.orderNumber });
          if (!order) throw new CheckoutError("invalid_state", "Order could not be created.");

          const pricedBySku = new Map(priced.lines.map((l) => [l.sku, l]));
          await tx.insert(schema.orderItems).values(
            lines.map((l) => {
              const p = pricedBySku.get(l.view.sku);
              return {
                orderId: order.id,
                variantId: l.variantId,
                productId: l.productId,
                sku: l.view.sku,
                productName: l.view.productName,
                variantTitle: l.variantTitle,
                imageUrl: l.view.image.src || null,
                quantity: l.input.quantity,
                unitPricePaise: l.input.unitPricePaise,
                compareAtPaise: l.input.compareAtPaise ?? null,
                discountPaise: p?.discountPaise ?? 0,
                taxRateBp: l.gstRateBp,
                taxPaise: p?.taxPaise ?? 0,
                lineTotalPaise: p?.lineTotalPaise ?? 0,
                hsnCode: l.hsnCode,
                returnPolicy: l.returnPolicy,
              };
            }),
          );

          const addressRow = (kind: "shipping" | "billing", a: AddressInput) => ({
            orderId: order.id,
            kind,
            fullName: a.fullName,
            phone: a.phone,
            line1: a.line1,
            line2: a.line2 ?? null,
            landmark: a.landmark ?? null,
            city: a.city,
            state: a.state,
            stateCode: a.stateCode,
            pincode: a.pincode,
            country: a.country ?? "IN",
          });
          await tx.insert(schema.orderAddresses).values([addressRow("shipping", input.shippingAddress), addressRow("billing", input.billingAddress ?? input.shippingAddress)]);

          const expiresAt = new Date(now().getTime() + reservationMs).toISOString();
          await tx.insert(schema.inventoryReservations).values(lines.map((l) => ({ variantId: l.variantId, locationId, quantity: l.input.quantity, orderId: order.id, cartToken: cart.token, expiresAt })));

          await addEvent(tx, order.id, "order_placed", { paymentMethod: input.paymentMethod, totalPaise: priced.totalPaise }, "customer");
          await enqueue(tx, "order_placed", { orderId: order.id });

          if (input.paymentMethod === "cod") {
            await consumeReservations(tx, order.id);
            await tx.update(schema.orders).set({ status: "confirmed" }).where(eq(schema.orders.id, order.id));
            await tx.update(schema.carts).set({ status: "converted" }).where(eq(schema.carts.id, cart.id));
            await addEvent(tx, order.id, "order_confirmed", { via: "cod" });
            await enqueue(tx, "order_confirmed", { orderId: order.id });
          }

          return { orderId: order.id, orderNumber: order.orderNumber, pricing: priced, cartToken: cart.token };
        }));
      } catch (error) {
        if (isUniqueViolation(error)) {
          const [dup] = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.idempotencyKey, input.idempotencyKey)).limit(1);
          if (dup) return loadResult(dup.id, false);
        }
        throw error;
      }

      if (input.paymentMethod === "razorpay") {
        if (!gateway) {
          await cancelOrder(orderId, "gateway_unavailable");
          throw new CheckoutError("payment_unavailable", "Online payment is not available right now.");
        }
        try {
          const { providerOrderId } = await gateway.createOrder({
            amountPaise: pricing.totalPaise,
            currency: "INR",
            receipt: orderNumber,
            notes: { order_number: orderNumber, order_id: orderId, cart_token: cartToken ?? "" },
          });
          await db.insert(schema.payments).values({ orderId, provider: "razorpay", providerOrderId, amountPaise: pricing.totalPaise, status: "created" });
        } catch (error) {
          await cancelOrder(orderId, "gateway_error");
          throw new CheckoutError("payment_unavailable", `Could not start the payment: ${error instanceof Error ? error.message : "unknown error"}`);
        }
      }

      return loadResult(orderId, true);
    },

    /** Browser callback. Signature proves origin; the gateway API confirms capture before anything is marked paid. */
    async confirmCheckoutCallback(input: { orderNumber: string; providerOrderId: string; providerPaymentId: string; signature: string }): Promise<{ status: "paid" | "pending" | "failed" }> {
      if (!gateway) throw new CheckoutError("payment_unavailable", "Online payment is not available right now.");
      const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, input.orderNumber)).limit(1);
      if (!order) throw new CheckoutError("order_not_found", "Order not found.");
      const [paymentRow] = await db.select().from(schema.payments).where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.providerOrderId, input.providerOrderId))).limit(1);
      if (!paymentRow) throw new CheckoutError("invalid_signature", "Payment does not belong to this order.");
      if (!gateway.verifyCheckoutSignature(input)) throw new CheckoutError("invalid_signature", "Payment signature could not be verified.");

      const payment = await gateway.fetchPayment(input.providerPaymentId);
      if (!payment || payment.orderId !== input.providerOrderId) throw new CheckoutError("invalid_signature", "Payment could not be verified with the gateway.");

      if (payment.status === "captured") {
        await markOrderPaid({ orderId: order.id, providerPaymentId: payment.id, providerOrderId: payment.orderId, amountPaise: payment.amountPaise, method: payment.method, raw: payment.raw, source: "callback" });
        return { status: "paid" };
      }
      if (payment.status === "failed") {
        await recordPaymentFailure({ orderId: order.id, providerPaymentId: payment.id, providerOrderId: payment.orderId, amountPaise: payment.amountPaise, raw: payment.raw });
        return { status: "failed" };
      }
      return { status: "pending" };
    },

    /** Razorpay webhook. Verified, idempotent on event id, safe to retry. */
    async handleWebhook(input: WebhookInput): Promise<WebhookResult> {
      if (!gateway) return { ok: false, status: 503, outcome: "gateway_not_configured" };
      const valid = gateway.verifyWebhookSignature(input.rawBody, input.signature);
      let body: RazorpayWebhookBody | null = null;
      try {
        body = JSON.parse(input.rawBody) as RazorpayWebhookBody;
      } catch {
        body = null;
      }

      const inserted = await db
        .insert(schema.webhookEvents)
        .values({ provider: "razorpay", providerEventId: input.eventId, signatureValid: valid, payload: body ?? { raw: input.rawBody.slice(0, 2000) } })
        .onConflictDoNothing()
        .returning({ id: schema.webhookEvents.id });
      if (!valid) return { ok: false, status: 400, outcome: "invalid_signature" };
      if (!body) return { ok: false, status: 400, outcome: "invalid_json" };

      let eventRowId = inserted[0]?.id;
      if (!eventRowId) {
        const [existing] = await db.select().from(schema.webhookEvents).where(and(eq(schema.webhookEvents.provider, "razorpay"), eq(schema.webhookEvents.providerEventId, input.eventId))).limit(1);
        if (existing?.processedAt) return { ok: true, status: 200, outcome: "duplicate" };
        eventRowId = existing?.id;
      }

      const finish = async (outcome: string, error: string | null = null) => {
        if (eventRowId) await db.update(schema.webhookEvents).set({ processedAt: error ? null : now().toISOString(), error }).where(eq(schema.webhookEvents.id, eventRowId));
        return { ok: error === null, status: error ? 500 : 200, outcome };
      };

      try {
        const entity = body.payload?.payment?.entity;
        if (!entity) return finish("ignored_no_payment");
        const orderId = await findOrderIdForPayment(entity.order_id ?? null, entity.notes);
        if (!orderId) return finish("order_not_found");
        const gp: GatewayPayment = { id: entity.id, orderId: entity.order_id ?? null, amountPaise: entity.amount, currency: entity.currency, status: entity.status === "captured" ? "captured" : entity.status === "failed" ? "failed" : "created", method: entity.method ?? null, raw: entity };
        switch (body.event) {
          case "payment.captured":
          case "order.paid": {
            const result = await markOrderPaid({ orderId, providerPaymentId: gp.id, providerOrderId: gp.orderId, amountPaise: gp.amountPaise, method: gp.method, raw: gp.raw, source: "webhook" });
            return finish(result.outcome);
          }
          case "payment.failed":
            await recordPaymentFailure({ orderId, providerPaymentId: gp.id, providerOrderId: gp.orderId, amountPaise: gp.amountPaise, raw: gp.raw });
            return finish("payment_failed");
          default:
            return finish(`ignored_${body.event}`);
        }
      } catch (error) {
        return finish("error", error instanceof Error ? error.message : "unknown");
      }
    },

    /** Cron: cancel orders whose reservations expired without payment. */
    async releaseExpiredReservations(): Promise<{ cancelled: number }> {
      const expired = await db
        .select({ orderId: schema.inventoryReservations.orderId })
        .from(schema.inventoryReservations)
        .where(and(eq(schema.inventoryReservations.status, "active"), lt(schema.inventoryReservations.expiresAt, now().toISOString())));
      let cancelled = 0;
      for (const orderId of new Set(expired.map((e) => e.orderId).filter((o): o is string => o !== null))) {
        if (await cancelOrder(orderId, "payment_timeout")) cancelled += 1;
      }
      return { cancelled };
    },

    /** Cron: ask the gateway about orders still pending; settles captured ones the webhook missed. */
    async reconcilePendingPayments(opts: { olderThanMinutes?: number; limit?: number } = {}): Promise<{ checked: number; paid: number; failed: number }> {
      if (!gateway) return { checked: 0, paid: 0, failed: 0 };
      const cutoff = new Date(now().getTime() - (opts.olderThanMinutes ?? 15) * 60_000).toISOString();
      const pending = await db
        .select({ orderId: schema.orders.id, providerOrderId: schema.payments.providerOrderId })
        .from(schema.orders)
        .innerJoin(schema.payments, and(eq(schema.payments.orderId, schema.orders.id), eq(schema.payments.provider, "razorpay")))
        .where(and(inArray(schema.orders.status, ["pending_payment", "payment_failed"]), lt(schema.orders.placedAt, cutoff)))
        .limit(opts.limit ?? 50);
      let paid = 0;
      let failed = 0;
      for (const row of pending) {
        if (!row.providerOrderId) continue;
        const payments = await gateway.fetchOrderPayments(row.providerOrderId);
        const captured = payments.find((p) => p.status === "captured");
        if (captured) {
          const r = await markOrderPaid({ orderId: row.orderId, providerPaymentId: captured.id, providerOrderId: captured.orderId, amountPaise: captured.amountPaise, method: captured.method, raw: captured.raw, source: "reconciliation" });
          if (r.changed) paid += 1;
          continue;
        }
        const lastFailed = payments.find((p) => p.status === "failed");
        if (lastFailed) {
          await recordPaymentFailure({ orderId: row.orderId, providerPaymentId: lastFailed.id, providerOrderId: lastFailed.orderId, amountPaise: lastFailed.amountPaise, raw: lastFailed.raw });
          failed += 1;
        }
      }
      return { checked: pending.length, paid, failed };
    },

    async getOrderByNumber(orderNumber: string) {
      const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, orderNumber)).limit(1);
      if (!order) return null;
      const [items, addresses, payment] = await Promise.all([
        db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
        db.select().from(schema.orderAddresses).where(eq(schema.orderAddresses.orderId, order.id)),
        db.select().from(schema.payments).where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.provider, "razorpay"))).orderBy(sql`${schema.payments.createdAt} desc`).limit(1),
      ]);
      return { order, items, addresses, payment: payment[0] ?? null };
    },
  };
}

export type CheckoutService = ReturnType<typeof createCheckoutService>;
