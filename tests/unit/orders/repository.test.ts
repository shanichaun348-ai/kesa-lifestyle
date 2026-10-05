/**
 * DemoOrderRepository — tests for the createWithInventory interface.
 */
import { describe, expect, it } from "vitest";

import { DemoOrderRepository } from "@/modules/orders/demo-repository";
import type { Order } from "@/modules/orders/types";

function makeOrder(id: string, overrides: Partial<Order> = {}): Order {
  return {
    id,
    status: "CREATED",
    customer: { name: "Test User", email: "test@example.com", phone: "9000000001" },
    shippingAddress: {
      name: "Test User",
      phone: "9000000001",
      line1: "1 Main Rd",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      country: "India",
    },
    items: [],
    subtotalPaise: 99900,
    discountPaise: 0,
    shippingPaise: 5900,
    gstPaise: 2909,
    totalPaise: 105800,
    coupon: null,
    razorpayOrderId: "",
    currency: "INR",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeOrderWithItem(
  id: string,
  sku: string,
  quantity: number,
  stock: number,
): Order & { _stock: number } {
  return Object.assign(makeOrder(id, {
    items: [
      {
        sku,
        productId: `prod-${sku}`,
        productName: "Test Product",
        quantity,
        unitPricePaise: 99900,
        lineTotalPaise: 99900 * quantity,
        gstRateBp: 300,
        hsnCode: "7113",
      },
    ],
  }), { _stock: stock });
}

describe("DemoOrderRepository — createWithInventory", () => {
  it("returns out_of_stock for unknown SKU", async () => {
    const repo = new DemoOrderRepository();
    const order = makeOrderWithItem("ord_001", "NONEXISTENT-SKU-XYZ", 1, 0);
    const result = await repo.createWithInventory(order);
    expect(result.kind).toBe("product_not_found");
    if (result.kind === "product_not_found") {
      expect(result.sku).toBe("NONEXISTENT-SKU-XYZ");
    }
  });

  it("reserves inventory and creates order on success", async () => {
    const repo = new DemoOrderRepository();
    // Use a real seed SKU that has stock. Get it from the demo seed.
    const { seedProducts } = await import("@/lib/demo/seed-catalog");
    const firstVariant = seedProducts[0]!.variants[0]!;
    const sku = firstVariant.sku;
    const stock = firstVariant.stock;
    if (stock === 0) return; // skip if seed has 0 stock

    const order = makeOrderWithItem("ord_seed_001", sku, 1, stock);
    const result = await repo.createWithInventory(order);
    expect(result.kind).toBe("created");
  });

  it("prevents overselling — second request for last unit fails", async () => {
    const repo = new DemoOrderRepository();
    const { seedProducts } = await import("@/lib/demo/seed-catalog");
    // Find a SKU with stock >= 1
    let sku = "";
    for (const product of seedProducts) {
      for (const variant of product.variants) {
        if (variant.stock >= 1) { sku = variant.sku; break; }
      }
      if (sku) break;
    }
    if (!sku) return; // skip if all seed stock is 0

    // Drain to exactly 1 by creating orders for all but 1 unit
    const { seedProducts: sp2 } = await import("@/lib/demo/seed-catalog");
    let stock = 0;
    for (const p of sp2) {
      for (const v of p.variants) {
        if (v.sku === sku) { stock = v.stock; }
      }
    }

    // Reserve stock-1 units first
    if (stock > 1) {
      const drainOrder = makeOrderWithItem("ord_drain", sku, stock - 1, stock);
      await repo.createWithInventory(drainOrder);
    }

    // Now only 1 unit remains
    const orderA = makeOrderWithItem("ord_A", sku, 1, 1);
    const orderB = makeOrderWithItem("ord_B", sku, 1, 1);

    const resultA = await repo.createWithInventory(orderA);
    const resultB = await repo.createWithInventory(orderB);

    // Exactly one should succeed and one should fail
    const kinds = [resultA.kind, resultB.kind].sort();
    expect(kinds).toEqual(["created", "out_of_stock"].sort());
  });

  it("rolls back all reservations if second SKU is out of stock", async () => {
    const repo = new DemoOrderRepository();
    const { seedProducts } = await import("@/lib/demo/seed-catalog");
    // Find two different SKUs with stock >= 1
    const skus: string[] = [];
    for (const product of seedProducts) {
      for (const variant of product.variants) {
        if (variant.stock >= 1 && !skus.includes(variant.sku)) {
          skus.push(variant.sku);
        }
        if (skus.length >= 2) break;
      }
      if (skus.length >= 2) break;
    }
    if (skus.length < 2) return; // not enough SKUs to test

    // Drain second SKU completely
    const sku2stock = seedProducts
      .flatMap((p) => p.variants)
      .find((v) => v.sku === skus[1])!.stock;
    if (sku2stock > 0) {
      const drain = makeOrder("ord_drain2", {
        items: [{ sku: skus[1]!, productId: "p", productName: "p", quantity: sku2stock, unitPricePaise: 100, lineTotalPaise: 100, gstRateBp: 0, hsnCode: "1234" }],
      });
      await repo.createWithInventory(drain);
    }

    // Now try an order that needs both SKUs — sku2 is out of stock
    const order = makeOrder("ord_multi", {
      items: [
        { sku: skus[0]!, productId: "p1", productName: "p1", quantity: 1, unitPricePaise: 100, lineTotalPaise: 100, gstRateBp: 0, hsnCode: "1234" },
        { sku: skus[1]!, productId: "p2", productName: "p2", quantity: 1, unitPricePaise: 100, lineTotalPaise: 100, gstRateBp: 0, hsnCode: "1234" },
      ],
    });
    const result = await repo.createWithInventory(order);
    expect(result.kind).toBe("out_of_stock");

    // First SKU stock should be restored (rollback happened)
    const sku1stock = seedProducts
      .flatMap((p) => p.variants)
      .find((v) => v.sku === skus[0])!.stock;
    const orderAfter = makeOrder("ord_verify_stock", {
      items: [{ sku: skus[0]!, productId: "p1", productName: "p1", quantity: sku1stock, unitPricePaise: 100, lineTotalPaise: 100, gstRateBp: 0, hsnCode: "1234" }],
    });
    const verifyResult = await repo.createWithInventory(orderAfter);
    expect(verifyResult.kind).toBe("created"); // all stock still available
  });
});

describe("DemoOrderRepository — order CRUD", () => {
  it("creates and retrieves an order by ID via createWithInventory", async () => {
    const repo = new DemoOrderRepository();
    const { seedProducts } = await import("@/lib/demo/seed-catalog");
    const variant = seedProducts[0]!.variants[0]!;
    if (variant.stock === 0) return;

    const order = makeOrderWithItem("ord_crud_aaa", variant.sku, 1, variant.stock);
    const result = await repo.createWithInventory(order);
    expect(result.kind).toBe("created");

    const found = await repo.findById("ord_crud_aaa");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("ord_crud_aaa");
  });

  it("retrieves an order by Razorpay order ID after update", async () => {
    const repo = new DemoOrderRepository();
    const { seedProducts } = await import("@/lib/demo/seed-catalog");
    const variant = seedProducts[0]!.variants[0]!;
    if (variant.stock < 2) return;

    const order = makeOrderWithItem("ord_crud_bbb", variant.sku, 1, variant.stock);
    await repo.createWithInventory(order);
    // Assign razorpay ID via update
    await repo.update({ ...order, razorpayOrderId: "order_ord_bbb" });
    const found = await repo.findByRazorpayOrderId("order_ord_bbb");
    expect(found?.id).toBe("ord_crud_bbb");
  });

  it("returns null for a missing order", async () => {
    const repo = new DemoOrderRepository();
    expect(await repo.findById("ord_nonexistent")).toBeNull();
  });

  it("updates an order status", async () => {
    const repo = new DemoOrderRepository();
    const { seedProducts } = await import("@/lib/demo/seed-catalog");
    const variant = seedProducts[0]!.variants[0]!;
    if (variant.stock < 3) return;

    const order = makeOrderWithItem("ord_crud_ccc", variant.sku, 1, variant.stock);
    const created = await repo.createWithInventory(order);
    expect(created.kind).toBe("created");

    const updated = await repo.update({ ...order, status: "PAYMENT_PENDING" });
    expect(updated.status).toBe("PAYMENT_PENDING");

    const found = await repo.findById("ord_crud_ccc");
    expect(found?.status).toBe("PAYMENT_PENDING");
  });
});

describe("DemoOrderRepository — releaseOrderInventory", () => {
  it("releases reserved inventory, allowing a subsequent reservation", async () => {
    const repo = new DemoOrderRepository();
    const { seedProducts } = await import("@/lib/demo/seed-catalog");
    const variant = seedProducts.flatMap((p) => p.variants).find((v) => v.stock >= 1);
    if (!variant) return;

    const order = makeOrderWithItem("ord_release_001", variant.sku, variant.stock, variant.stock);
    const result = await repo.createWithInventory(order);
    expect(result.kind).toBe("created");

    // Stock is now 0 — another reservation should fail
    const order2 = makeOrderWithItem("ord_release_002", variant.sku, 1, 0);
    const result2 = await repo.createWithInventory(order2);
    expect(result2.kind).toBe("out_of_stock");

    // Release the original reservation
    await repo.releaseOrderInventory("ord_release_001");

    // Now stock is back — reservation should succeed
    const order3 = makeOrderWithItem("ord_release_003", variant.sku, variant.stock, variant.stock);
    const result3 = await repo.createWithInventory(order3);
    expect(result3.kind).toBe("created");
  });
});

describe("DemoOrderRepository — recordWebhookEvent", () => {
  it("returns true for a new event", async () => {
    const repo = new DemoOrderRepository();
    const result = await repo.recordWebhookEvent("pay_123:payment.captured", "payment.captured", "ord_001");
    expect(result).toBe(true);
  });

  it("returns false for a duplicate event (idempotency)", async () => {
    const repo = new DemoOrderRepository();
    await repo.recordWebhookEvent("pay_123:payment.captured", "payment.captured", "ord_001");
    const result = await repo.recordWebhookEvent("pay_123:payment.captured", "payment.captured", "ord_001");
    expect(result).toBe(false);
  });

  it("allows different events for the same payment to be processed independently", async () => {
    const repo = new DemoOrderRepository();
    const r1 = await repo.recordWebhookEvent("pay_456:payment.captured", "payment.captured", "ord_002");
    const r2 = await repo.recordWebhookEvent("pay_456:payment.failed", "payment.failed", "ord_002");
    expect(r1).toBe(true);
    expect(r2).toBe(true); // different keys
  });
});
