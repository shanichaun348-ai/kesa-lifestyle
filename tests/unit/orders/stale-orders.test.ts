import { describe, expect, it, vi } from "vitest";

import type { RazorpayPayment } from "@/lib/razorpay";
import { capturedPaymentFor, reconcileStaleOrders, STALE_AFTER_MS } from "@/modules/orders/stale-orders";
import type { Order } from "@/modules/orders/types";

const NOW = new Date("2026-10-22T10:00:00Z");

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: overrides.id ?? "ord_1",
    orderNumber: 1042,
    status: "PAYMENT_PENDING",
    customer: { name: "Priya", email: "priya@example.com", phone: "9876543210" },
    shippingAddress: { name: "Priya", phone: "9876543210", line1: "1 Road", city: "Surat", state: "GJ", pincode: "395001", country: "India" },
    items: [{ sku: "T-1", productId: "p1", productName: "Test", quantity: 1, unitPricePaise: 29900, lineTotalPaise: 29900, gstRateBp: 300, hsnCode: "7117" }],
    subtotalPaise: 29900,
    discountPaise: 0,
    shippingPaise: 5900,
    gstPaise: 0,
    totalPaise: 35800,
    coupon: null,
    razorpayOrderId: "order_X",
    currency: "INR",
    createdAt: new Date(NOW.getTime() - 2 * STALE_AFTER_MS).toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  } as Order;
}

function payment(overrides: Partial<RazorpayPayment> = {}): RazorpayPayment {
  return { id: "pay_1", order_id: "order_X", amount: 35800, currency: "INR", status: "captured", captured: true, ...overrides };
}

function fakeRepo(stale: Order[]) {
  const updated: Order[] = [];
  const released: string[] = [];
  return {
    updated,
    released,
    repo: {
      listStaleUnpaid: vi.fn(async () => stale),
      update: vi.fn(async (o: Order) => {
        updated.push(o);
        return o;
      }),
      releaseOrderInventory: vi.fn(async (id: string) => {
        released.push(id);
      }),
    },
  };
}

describe("capturedPaymentFor", () => {
  it("only accepts a captured payment for the exact total", () => {
    expect(capturedPaymentFor({ totalPaise: 35800 }, [payment()])?.id).toBe("pay_1");
    expect(capturedPaymentFor({ totalPaise: 35800 }, [payment({ status: "authorized" })])).toBeNull();
    expect(capturedPaymentFor({ totalPaise: 35800 }, [payment({ amount: 100 })])).toBeNull();
    expect(capturedPaymentFor({ totalPaise: 35800 }, [])).toBeNull();
  });
});

describe("reconcileStaleOrders", () => {
  it("cancels an unpaid order and releases its stock", async () => {
    const { repo, updated, released } = fakeRepo([order()]);
    const notify = vi.fn(async () => undefined);
    const summary = await reconcileStaleOrders({ repo, fetchPayments: async () => [payment({ status: "failed", captured: false })], notifyPaid: notify, now: NOW });

    expect(summary).toEqual({ candidates: 1, cancelled: 1, paid: 0, skipped: 0, failed: 0 });
    expect(updated[0]?.status).toBe("CANCELLED");
    expect(updated[0]?.cancelledAt).toBeDefined();
    expect(released).toEqual(["ord_1"]);
    expect(notify).not.toHaveBeenCalled();
    expect(repo.listStaleUnpaid).toHaveBeenCalledWith(new Date(NOW.getTime() - STALE_AFTER_MS), 100);
  });

  it("marks an order paid when Razorpay captured the money and we never heard", async () => {
    const { repo, updated, released } = fakeRepo([order()]);
    const notify = vi.fn(async () => undefined);
    const summary = await reconcileStaleOrders({ repo, fetchPayments: async () => [payment()], notifyPaid: notify, now: NOW });

    expect(summary.paid).toBe(1);
    expect(summary.cancelled).toBe(0);
    expect(updated[0]?.status).toBe("PAID");
    expect(updated[0]?.razorpayPaymentId).toBe("pay_1");
    expect(released).toEqual([]);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("recovers a PAYMENT_FAILED order that was paid on a retry", async () => {
    const { repo, updated } = fakeRepo([order({ status: "PAYMENT_FAILED" })]);
    await reconcileStaleOrders({ repo, fetchPayments: async () => [payment({ status: "failed", captured: false, id: "pay_0" }), payment({ id: "pay_2" })], notifyPaid: async () => undefined, now: NOW });
    expect(updated[0]?.status).toBe("PAID");
    expect(updated[0]?.razorpayPaymentId).toBe("pay_2");
  });

  it("cancels a CREATED order with no Razorpay order at all", async () => {
    const { repo, updated, released } = fakeRepo([order({ status: "CREATED", razorpayOrderId: "" })]);
    const fetchPayments = vi.fn(async () => []);
    await reconcileStaleOrders({ repo, fetchPayments, notifyPaid: async () => undefined, now: NOW });
    expect(fetchPayments).not.toHaveBeenCalled();
    expect(updated[0]?.status).toBe("CANCELLED");
    expect(released).toEqual(["ord_1"]);
  });

  it("leaves an authorised-but-uncaptured payment for the next run", async () => {
    const { repo, updated, released } = fakeRepo([order()]);
    const summary = await reconcileStaleOrders({ repo, fetchPayments: async () => [payment({ status: "authorized", captured: false })], notifyPaid: async () => undefined, now: NOW });
    expect(summary.skipped).toBe(1);
    expect(updated).toEqual([]);
    expect(released).toEqual([]);
  });

  it("keeps going when one order's gateway lookup fails", async () => {
    const { repo, updated } = fakeRepo([order({ id: "ord_a", razorpayOrderId: "order_A" }), order({ id: "ord_b", razorpayOrderId: "order_B" })]);
    const summary = await reconcileStaleOrders({
      repo,
      fetchPayments: async (id) => {
        if (id === "order_A") throw new Error("network");
        return [];
      },
      notifyPaid: async () => undefined,
      now: NOW,
    });
    expect(summary.failed).toBe(1);
    expect(summary.cancelled).toBe(1);
    expect(updated.map((o) => o.id)).toEqual(["ord_b"]);
  });
});
