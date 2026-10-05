import { describe, expect, it } from "vitest";

import { canTransition, transitionOrder } from "@/modules/orders/state-machine";
import type { Order, OrderStatus } from "@/modules/orders/types";

function makeOrder(status: OrderStatus): Order {
  return {
    id: "ord_test",
    status,
    customer: { name: "Test", email: "t@t.com", phone: "9000000001" },
    shippingAddress: { name: "Test", phone: "9000000001", line1: "1 Road", city: "Mumbai", state: "Maharashtra", pincode: "400001", country: "India" },
    items: [],
    subtotalPaise: 99900,
    discountPaise: 0,
    shippingPaise: 0,
    gstPaise: 2909,
    totalPaise: 99900,
    coupon: null,
    razorpayOrderId: "order_test",
    currency: "INR",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("canTransition — valid transitions", () => {
  const cases: Array<[OrderStatus, OrderStatus]> = [
    ["CREATED", "PAYMENT_PENDING"],
    ["CREATED", "CANCELLED"],
    ["PAYMENT_PENDING", "PAID"],
    ["PAYMENT_PENDING", "PAYMENT_FAILED"],
    ["PAYMENT_PENDING", "CANCELLED"],
    ["PAID", "PROCESSING"],
    ["PAID", "REFUNDED"],
    ["PAYMENT_FAILED", "PAYMENT_PENDING"],
    ["PROCESSING", "SHIPPED"],
    ["PROCESSING", "REFUNDED"],
    ["SHIPPED", "DELIVERED"],
    ["SHIPPED", "REFUNDED"],
    ["DELIVERED", "REFUNDED"],
  ];
  for (const [from, to] of cases) {
    it(`${from} → ${to} is valid`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }
});

describe("canTransition — invalid transitions", () => {
  const cases: Array<[OrderStatus, OrderStatus]> = [
    ["DELIVERED", "PAYMENT_PENDING"],
    ["REFUNDED", "PAID"],
    ["REFUNDED", "PROCESSING"],
    ["CANCELLED", "PAID"],
    ["CANCELLED", "PAYMENT_PENDING"],
    ["PAID", "CREATED"],
    ["PAID", "PAYMENT_PENDING"],
    ["SHIPPED", "PAYMENT_PENDING"],
    ["DELIVERED", "CREATED"],
  ];
  for (const [from, to] of cases) {
    it(`${from} → ${to} is invalid`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }
});

describe("transitionOrder", () => {
  it("returns a new order with the updated status", () => {
    const order = makeOrder("CREATED");
    const updated = transitionOrder(order, "PAYMENT_PENDING");
    expect(updated.status).toBe("PAYMENT_PENDING");
    expect(updated.id).toBe(order.id);
  });

  it("sets paidAt when transitioning to PAID", () => {
    const order = makeOrder("PAYMENT_PENDING");
    const paid = transitionOrder(order, "PAID");
    expect(paid.paidAt).toBeDefined();
    expect(typeof paid.paidAt).toBe("string");
  });

  it("does NOT set paidAt for other transitions", () => {
    const order = makeOrder("CREATED");
    const pending = transitionOrder(order, "PAYMENT_PENDING");
    expect(pending.paidAt).toBeUndefined();
  });

  it("updates updatedAt on every transition", () => {
    const order = makeOrder("CREATED");
    const updated = transitionOrder(order, "PAYMENT_PENDING");
    expect(updated.updatedAt).not.toBe(order.updatedAt);
  });

  it("throws on an invalid transition", () => {
    const order = makeOrder("DELIVERED");
    expect(() => transitionOrder(order, "PAYMENT_PENDING")).toThrow();
  });

  it("throws REFUNDED → PAID", () => {
    const order = makeOrder("REFUNDED");
    expect(() => transitionOrder(order, "PAID")).toThrow();
  });

  it("does not mutate the original order", () => {
    const order = makeOrder("CREATED");
    const originalStatus = order.status;
    transitionOrder(order, "PAYMENT_PENDING");
    expect(order.status).toBe(originalStatus);
  });
});
