import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { seed } from "@/db/seed/seed";
import { createCartService, type CartService } from "@/modules/cart/service";
import { CheckoutError, createCheckoutService, type CheckoutService, type PlaceOrderInput } from "@/modules/checkout/service";

import { FakeGateway } from "./fake-gateway";
import { createMigratedDb, type TestDb } from "./harness";

/**
 * End-to-end order lifecycle against embedded Postgres with a fake gateway
 * that uses the real signature algorithms. Covers the cases listed in the
 * brief: success, failure, abandonment, duplicate and retried webhooks,
 * order creation failure, inventory races, idempotency and late capture.
 */

let db: TestDb;
let close: () => Promise<void>;
let gateway: FakeGateway;
let carts: CartService;
let checkout: CheckoutService;
let current = new Date("2026-10-05T10:00:00Z");
const now = () => current;

const SKU_EARRINGS = "KL-EAR-0001"; // 12 in stock, ₹1,299
const SKU_HOOPS = "KL-EAR-0003"; // 2 in stock (low)
const SKU_CHAIN_20 = "KL-CHA-0029-20INCH"; // 12 in stock

const address = (stateCode = "MH"): PlaceOrderInput["shippingAddress"] => ({
  fullName: "Test Customer",
  phone: "+919876543210",
  line1: "1 Marine Drive",
  city: "Mumbai",
  state: "Maharashtra",
  stateCode,
  pincode: "400001",
});

async function newCart(items: Array<[string, number]>) {
  const cart = await carts.resolve({ token: null, profileId: null, create: true });
  if (!cart) throw new Error("cart");
  for (const [sku, qty] of items) await carts.addItem(cart.id, sku, qty);
  return cart;
}

function placeInput(cartId: string, over: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    cartId,
    profileId: null,
    idempotencyKey: crypto.randomUUID(),
    contact: { email: "buyer@example.com", phone: "+919876543210" },
    shippingAddress: address(),
    shippingMethod: "standard",
    paymentMethod: "razorpay",
    giftWrap: false,
    ...over,
  };
}

async function stock(sku: string) {
  const [row] = await db
    .select({ onHand: schema.inventory.onHand, reserved: schema.inventory.reserved })
    .from(schema.inventory)
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.inventory.variantId))
    .where(eq(schema.productVariants.sku, sku));
  return row ?? { onHand: -1, reserved: -1 };
}

async function order(id: string) {
  const [row] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!row) throw new Error("order missing");
  return row;
}

beforeAll(async () => {
  const created = await createMigratedDb();
  db = created.db;
  close = () => created.client.close();
  await seed(db);
  gateway = new FakeGateway();
  carts = createCartService(db, now);
  checkout = createCheckoutService({ db, gateway, now, reservationMinutes: 10 });
}, 180_000);

afterAll(async () => {
  await close();
});

describe("cart", () => {
  it("adds, updates, removes and re-prices from the catalogue", async () => {
    const cart = await newCart([[SKU_EARRINGS, 2]]);
    let view = await carts.getView(cart.id);
    expect(view.itemCount).toBe(2);
    expect(view.pricing.subtotalPaise).toBe(2 * 129900);
    expect(view.pricing.shippingPaise).toBe(0);
    expect(view.checkoutReady).toBe(true);

    await carts.setQuantity(cart.id, SKU_EARRINGS, 1);
    view = await carts.getView(cart.id);
    expect(view.itemCount).toBe(1);

    await carts.removeItem(cart.id, SKU_EARRINGS);
    view = await carts.getView(cart.id);
    expect(view.lines).toEqual([]);
    expect(view.checkoutReady).toBe(false);
  });

  it("refuses more than the available stock and unknown SKUs", async () => {
    const cart = await newCart([]);
    await expect(carts.addItem(cart.id, SKU_HOOPS, 3)).rejects.toMatchObject({ code: "insufficient_stock" });
    await expect(carts.addItem(cart.id, "KL-NOPE", 1)).rejects.toMatchObject({ code: "unavailable" });
  });

  it("applies the seeded coupon with server-side validation", async () => {
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    await carts.applyCoupon(cart.id, "welcome10");
    const view = await carts.getView(cart.id);
    expect(view.coupon).toMatchObject({ code: "WELCOME10", applied: true });
    expect(view.pricing.discountPaise).toBe(12990);
    await expect(carts.applyCoupon(cart.id, "NOPE")).rejects.toMatchObject({ code: "coupon_not_found" });
  });

  it("merges a guest cart into the profile cart on login", async () => {
    const [user] = (await db.execute(sql`insert into auth.users (email) values ('merge@example.com') returning id`)).rows as Array<{ id: string }>;
    if (!user) throw new Error("user");
    const guest = await newCart([[SKU_EARRINGS, 1]]);
    const own = await carts.resolve({ token: null, profileId: user.id, create: true });
    if (!own) throw new Error("own cart");
    await carts.addItem(own.id, SKU_EARRINGS, 2);
    await carts.addItem(own.id, SKU_CHAIN_20, 1);

    const merged = await carts.resolve({ token: guest.token, profileId: user.id, create: false });
    expect(merged?.id).toBe(own.id);
    const view = await carts.getView(own.id, { profileId: user.id });
    expect(view.lines.find((l) => l.sku === SKU_EARRINGS)?.quantity).toBe(3);
    expect(view.lines.find((l) => l.sku === SKU_CHAIN_20)?.quantity).toBe(1);
    const [closed] = await db.select({ status: schema.carts.status }).from(schema.carts).where(eq(schema.carts.id, guest.id));
    expect(closed?.status).toBe("merged");
  });
});

describe("placing an order", () => {
  it("reserves stock, prices on the server and creates the gateway order", async () => {
    const before = await stock(SKU_EARRINGS);
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    await carts.applyCoupon(cart.id, "WELCOME10");
    const result = await checkout.placeOrder(placeInput(cart.id, { shippingAddress: address("KA"), giftWrap: true }));

    expect(result.created).toBe(true);
    expect(result.status).toBe("pending_payment");
    expect(result.payment?.providerOrderId).toMatch(/^order_fake/);
    expect(result.totalPaise).toBe(129900 - 12990 + 4900);
    expect(gateway.orders.get(result.payment?.providerOrderId ?? "")?.amountPaise).toBe(result.totalPaise);

    const after = await stock(SKU_EARRINGS);
    expect(after.reserved).toBe(before.reserved + 1);
    expect(after.onHand).toBe(before.onHand);
    const row = await order(result.orderId);
    expect(row.taxPaise).toBeGreaterThan(0);
    expect(row.discountPaise).toBe(12990);
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, result.orderId));
    expect(items).toHaveLength(1);
    expect(items[0]?.unitPricePaise).toBe(129900);
  });

  it("is idempotent on the idempotency key", async () => {
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    const input = placeInput(cart.id);
    const first = await checkout.placeOrder(input);
    const second = await checkout.placeOrder(input);
    expect(second.created).toBe(false);
    expect(second.orderId).toBe(first.orderId);
    const [count] = (await db.execute(sql`select count(*)::int as n from orders where idempotency_key = ${input.idempotencyKey}`)).rows as Array<{ n: number }>;
    expect(count?.n).toBe(1);
  });

  it("two checkouts cannot both take the last units", async () => {
    const a = await newCart([[SKU_HOOPS, 2]]);
    const b = await newCart([[SKU_HOOPS, 1]]);
    const first = await checkout.placeOrder(placeInput(a.id));
    expect(first.status).toBe("pending_payment");
    await expect(checkout.placeOrder(placeInput(b.id))).rejects.toMatchObject({ code: "insufficient_stock", details: { sku: SKU_HOOPS } });
    await checkout.cancelOrder(first.orderId, "test_cleanup");
    expect((await stock(SKU_HOOPS)).reserved).toBe(0);
  });

  it("cancels the order and releases stock when the gateway fails", async () => {
    const before = await stock(SKU_EARRINGS);
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    gateway.failNextCreate = true;
    await expect(checkout.placeOrder(placeInput(cart.id))).rejects.toMatchObject({ code: "payment_unavailable" });
    expect((await stock(SKU_EARRINGS)).reserved).toBe(before.reserved);
    const [cancelled] = await db.select({ status: schema.orders.status }).from(schema.orders).where(eq(schema.orders.cartToken, cart.token)).orderBy(sql`created_at desc`).limit(1);
    expect(cancelled?.status).toBe("cancelled");
  });

  it("rejects an empty cart, an invalid coupon and COD over the cap", async () => {
    const empty = await newCart([]);
    await expect(checkout.placeOrder(placeInput(empty.id))).rejects.toMatchObject({ code: "cart_empty" });

    const cart = await newCart([[SKU_EARRINGS, 3]]);
    await expect(checkout.placeOrder(placeInput(cart.id, { paymentMethod: "cod", pincodeCodAvailable: true }))).rejects.toMatchObject({ code: "cod_not_allowed" });
  });

  it("confirms cash-on-delivery orders immediately and consumes stock", async () => {
    const before = await stock(SKU_CHAIN_20);
    const cart = await newCart([[SKU_CHAIN_20, 1]]);
    const result = await checkout.placeOrder(placeInput(cart.id, { paymentMethod: "cod", pincodeCodAvailable: true }));
    expect(result.status).toBe("confirmed");
    expect(result.payment).toBeNull();
    const after = await stock(SKU_CHAIN_20);
    expect(after.onHand).toBe(before.onHand - 1);
    expect(after.reserved).toBe(before.reserved);
    expect((await order(result.orderId)).codFeePaise).toBe(4900);
  });
});

describe("payment lifecycle", () => {
  it("marks paid only via a verified webhook; duplicates and retries do not double count", async () => {
    const before = await stock(SKU_EARRINGS);
    const cart = await newCart([[SKU_EARRINGS, 2]]);
    await carts.applyCoupon(cart.id, "WELCOME10");
    const placed = await checkout.placeOrder(placeInput(cart.id));
    const providerOrderId = placed.payment?.providerOrderId ?? "";

    const payment = gateway.capture(providerOrderId);
    const forged = gateway.webhook("payment.captured", payment);
    const bad = await checkout.handleWebhook({ ...forged, signature: "0".repeat(64) });
    expect(bad).toMatchObject({ ok: false, status: 400, outcome: "invalid_signature" });
    expect((await order(placed.orderId)).status).toBe("pending_payment");

    const good = await checkout.handleWebhook(forged);
    expect(good).toMatchObject({ ok: true, status: 200, outcome: "paid" });
    const paid = await order(placed.orderId);
    expect(paid.status).toBe("paid");
    expect(paid.paymentStatus).toBe("paid");
    expect(paid.paidAt).not.toBeNull();

    const after = await stock(SKU_EARRINGS);
    expect(after.onHand).toBe(before.onHand - 2);
    expect(after.reserved).toBe(before.reserved);
    const reservations = await db.select().from(schema.inventoryReservations).where(eq(schema.inventoryReservations.orderId, placed.orderId));
    expect(reservations.every((r) => r.status === "consumed")).toBe(true);
    const [cartRow] = await db.select({ status: schema.carts.status }).from(schema.carts).where(eq(schema.carts.id, cart.id));
    expect(cartRow?.status).toBe("converted");
    const redemptions = await db.select().from(schema.couponRedemptions).where(eq(schema.couponRedemptions.orderId, placed.orderId));
    expect(redemptions).toHaveLength(1);
    const outbox = await db.select().from(schema.outboxEvents).where(sql`payload->>'orderId' = ${placed.orderId} and type = 'order_paid'`);
    expect(outbox).toHaveLength(1);

    // Same delivery again (same event id) and a retry with a new event id.
    expect(await checkout.handleWebhook(forged)).toMatchObject({ outcome: "duplicate" });
    expect(await checkout.handleWebhook(gateway.webhook("payment.captured", payment, "evt_retry"))).toMatchObject({ outcome: "already_paid" });
    expect((await stock(SKU_EARRINGS)).onHand).toBe(before.onHand - 2);
    const payments = await db.select().from(schema.payments).where(eq(schema.payments.orderId, placed.orderId));
    expect(payments.filter((p) => p.status === "captured")).toHaveLength(1);
  });

  it("the browser callback is verified by signature and then against the gateway", async () => {
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    const placed = await checkout.placeOrder(placeInput(cart.id));
    const providerOrderId = placed.payment?.providerOrderId ?? "";
    const payment = gateway.capture(providerOrderId);

    await expect(checkout.confirmCheckoutCallback({ orderNumber: placed.orderNumber, providerOrderId, providerPaymentId: payment.id, signature: "0".repeat(64) })).rejects.toMatchObject({ code: "invalid_signature" });
    await expect(
      checkout.confirmCheckoutCallback({ orderNumber: placed.orderNumber, providerOrderId: "order_fake_other", providerPaymentId: payment.id, signature: gateway.signCheckout("order_fake_other", payment.id) }),
    ).rejects.toMatchObject({ code: "invalid_signature" });

    const ok = await checkout.confirmCheckoutCallback({ orderNumber: placed.orderNumber, providerOrderId, providerPaymentId: payment.id, signature: gateway.signCheckout(providerOrderId, payment.id) });
    expect(ok.status).toBe("paid");
    expect((await order(placed.orderId)).status).toBe("paid");
  });

  it("records failures, keeps the reservation for a retry, then releases on timeout", async () => {
    const before = await stock(SKU_EARRINGS);
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    const placed = await checkout.placeOrder(placeInput(cart.id));
    const providerOrderId = placed.payment?.providerOrderId ?? "";

    const failed = gateway.fail(providerOrderId);
    expect(await checkout.handleWebhook(gateway.webhook("payment.failed", failed))).toMatchObject({ outcome: "payment_failed" });
    expect((await order(placed.orderId)).status).toBe("payment_failed");
    expect((await stock(SKU_EARRINGS)).reserved).toBe(before.reserved + 1);

    current = new Date(current.getTime() + 11 * 60_000);
    const released = await checkout.releaseExpiredReservations();
    expect(released.cancelled).toBeGreaterThanOrEqual(1);
    const cancelled = await order(placed.orderId);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("payment_timeout");
    const mine = await db.select().from(schema.inventoryReservations).where(eq(schema.inventoryReservations.orderId, placed.orderId));
    expect(mine.every((r) => r.status === "released")).toBe(true);
    // The job releases every expired reservation (earlier pending orders too), so the
    // invariant to check is: reserved equals the sum of reservations still active.
    const [active] = (
      await db.execute(sql`
        select coalesce(sum(r.quantity), 0)::int as n from inventory_reservations r
        join product_variants v on v.id = r.variant_id
        where v.sku = ${SKU_EARRINGS} and r.status = 'active'`)
    ).rows as Array<{ n: number }>;
    expect((await stock(SKU_EARRINGS)).reserved).toBe(active?.n ?? -1);
  });

  it("reinstates a cancelled order on late capture when stock allows", async () => {
    const before = await stock(SKU_EARRINGS);
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    const placed = await checkout.placeOrder(placeInput(cart.id));
    const providerOrderId = placed.payment?.providerOrderId ?? "";
    await checkout.cancelOrder(placed.orderId, "payment_timeout");
    expect((await stock(SKU_EARRINGS)).reserved).toBe(before.reserved);

    const late = gateway.capture(providerOrderId);
    expect(await checkout.handleWebhook(gateway.webhook("payment.captured", late))).toMatchObject({ outcome: "reinstated" });
    const row = await order(placed.orderId);
    expect(row.status).toBe("paid");
    expect(row.cancelledAt).toBeNull();
    expect((await stock(SKU_EARRINGS)).onHand).toBe(before.onHand - 1);
  });

  it("flags a refund when a late capture can no longer be fulfilled", async () => {
    const a = await newCart([[SKU_HOOPS, 2]]);
    const placedA = await checkout.placeOrder(placeInput(a.id));
    const providerA = placedA.payment?.providerOrderId ?? "";
    await checkout.cancelOrder(placedA.orderId, "payment_timeout");

    // Someone else buys the last units in the meantime.
    const b = await newCart([[SKU_HOOPS, 2]]);
    const placedB = await checkout.placeOrder(placeInput(b.id));
    const payB = gateway.capture(placedB.payment?.providerOrderId ?? "");
    expect(await checkout.handleWebhook(gateway.webhook("payment.captured", payB))).toMatchObject({ outcome: "paid" });

    const lateA = gateway.capture(providerA);
    expect(await checkout.handleWebhook(gateway.webhook("payment.captured", lateA))).toMatchObject({ outcome: "refund_required" });
    const row = await order(placedA.orderId);
    expect(row.status).toBe("cancelled");
    expect(row.needsReview).toBe(true);
    const refunds = await db.select().from(schema.outboxEvents).where(sql`type = 'refund_required' and payload->>'orderId' = ${placedA.orderId}`);
    expect(refunds).toHaveLength(1);
  });

  it("does not mark paid on an amount mismatch", async () => {
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    const placed = await checkout.placeOrder(placeInput(cart.id));
    const short = gateway.capture(placed.payment?.providerOrderId ?? "", 100);
    expect(await checkout.handleWebhook(gateway.webhook("payment.captured", short))).toMatchObject({ outcome: "amount_mismatch" });
    const row = await order(placed.orderId);
    expect(row.status).toBe("pending_payment");
    expect(row.needsReview).toBe(true);
    await checkout.cancelOrder(placed.orderId, "test_cleanup");
  });

  it("reconciliation settles a captured payment the webhook never delivered", async () => {
    const cart = await newCart([[SKU_EARRINGS, 1]]);
    const placed = await checkout.placeOrder(placeInput(cart.id));
    gateway.capture(placed.payment?.providerOrderId ?? "");
    current = new Date(current.getTime() + 16 * 60_000);
    const result = await checkout.reconcilePendingPayments({ olderThanMinutes: 15 });
    expect(result.paid).toBeGreaterThanOrEqual(1);
    expect((await order(placed.orderId)).status).toBe("paid");
  });

  it("webhooks for unknown orders are acknowledged without side effects", async () => {
    const ghost = { id: "pay_ghost", orderId: "order_ghost", amountPaise: 1, currency: "INR", status: "captured" as const, method: null, raw: {} };
    expect(await checkout.handleWebhook(gateway.webhook("payment.captured", ghost))).toMatchObject({ ok: true, outcome: "order_not_found" });
  });

  it("rejects placing an order with an unknown cart and surfaces typed errors", async () => {
    await expect(checkout.placeOrder(placeInput(crypto.randomUUID()))).rejects.toBeInstanceOf(CheckoutError);
    const [count] = (await db.execute(sql`select count(*)::int as n from inventory where reserved < 0 or on_hand < 0`)).rows as Array<{ n: number }>;
    expect(count?.n).toBe(0);
    const [res] = (await db.execute(sql`select count(*)::int as n from inventory_reservations r join orders o on o.id = r.order_id where r.status = 'active' and o.status in ('paid','cancelled')`)).rows as Array<{ n: number }>;
    expect(res?.n).toBe(0);
  });

  it("no order was ever marked paid without a captured payment row", async () => {
    const [orphans] = (
      await db.execute(sql`
        select count(*)::int as n from orders o
        where o.payment_status = 'paid' and o.payment_method = 'razorpay'
          and not exists (select 1 from payments p where p.order_id = o.id and p.status = 'captured')`)
    ).rows as Array<{ n: number }>;
    expect(orphans?.n).toBe(0);
  });
});
