/**
 * SupabaseOrderRepository — unit tests with mocked Supabase client.
 * These tests verify the repository's behavior contract without a real DB.
 * For correctness of stored procedures, see tests/integration/ (requires a live Supabase instance).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only and supabase client before importing the module under test
vi.mock("@/lib/supabase", () => ({
  getSupabaseServiceClient: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
}));

import { getSupabaseServiceClient } from "@/lib/supabase";
import { SupabaseOrderRepository } from "@/modules/orders/supabase-repository";
import type { Order } from "@/modules/orders/types";

function makeOrder(id: string): Order {
  return {
    id,
    status: "CREATED",
    customer: { name: "Test", email: "test@example.com", phone: "9000000001" },
    shippingAddress: {
      name: "Test",
      phone: "9000000001",
      line1: "1 Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      country: "India",
    },
    items: [
      {
        sku: "TEST-SKU-001",
        productId: "prod-001",
        productName: "Test Ring",
        quantity: 1,
        unitPricePaise: 49900,
        lineTotalPaise: 49900,
        gstRateBp: 300,
        hsnCode: "7113",
      },
    ],
    subtotalPaise: 49900,
    discountPaise: 0,
    shippingPaise: 5900,
    gstPaise: 1453,
    totalPaise: 55800,
    coupon: null,
    razorpayOrderId: "",
    currency: "INR",
    createdAt: "2026-10-06T00:00:00Z",
    updatedAt: "2026-10-06T00:00:00Z",
  };
}

function makeDbRow(order: Order) {
  return {
    id: order.id,
    status: order.status,
    customer_name: order.customer.name,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone,
    shipping_address: order.shippingAddress,
    subtotal_paise: order.subtotalPaise,
    discount_paise: order.discountPaise,
    shipping_paise: order.shippingPaise,
    gst_paise: order.gstPaise,
    total_paise: order.totalPaise,
    coupon: null,
    razorpay_order_id: order.razorpayOrderId || null,
    razorpay_payment_id: null,
    currency: "INR",
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    paid_at: null,
    order_items: order.items.map((item) => ({
      id: `item-${item.sku}`,
      order_id: order.id,
      sku: item.sku,
      product_id: item.productId,
      product_name: item.productName,
      variant_option_value: null,
      quantity: item.quantity,
      unit_price_paise: item.unitPricePaise,
      line_total_paise: item.lineTotalPaise,
      gst_rate_bp: item.gstRateBp,
      hsn_code: item.hsnCode,
    })),
  };
}

function createMockDb() {
  const rpcMock = vi.fn();
  const fromMock = vi.fn();
  const mockDb = { rpc: rpcMock, from: fromMock };
  vi.mocked(getSupabaseServiceClient).mockReturnValue(mockDb as never);
  return { rpcMock, fromMock, mockDb };
}

describe("SupabaseOrderRepository — createWithInventory", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls create_order_with_inventory RPC with correct params", async () => {
    const { rpcMock, fromMock } = createMockDb();
    const order = makeOrder("ord_test_001");

    // RPC returns success
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, orderId: order.id, idempotent: false },
      error: null,
    });

    // findById query (called after creation to return the order)
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValueOnce({ data: makeDbRow(order), error: null });
    fromMock.mockReturnValue({ select: selectMock, eq: eqMock, single: singleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });

    const repo = new SupabaseOrderRepository();
    const result = await repo.createWithInventory(order, "idem-key-001");

    expect(result.kind).toBe("created");
    expect(rpcMock).toHaveBeenCalledWith(
      "create_order_with_inventory",
      expect.objectContaining({
        p_order_id: order.id,
        p_idempotency_key: "idem-key-001",
        p_total_paise: order.totalPaise,
      }),
    );
  });

  it("returns out_of_stock when RPC reports INSUFFICIENT_STOCK", async () => {
    const { rpcMock } = createMockDb();
    const order = makeOrder("ord_oos_001");

    rpcMock.mockResolvedValueOnce({
      data: { ok: false, error: "INSUFFICIENT_STOCK", sku: "TEST-SKU-001", available: 0, requested: 1 },
      error: null,
    });

    const repo = new SupabaseOrderRepository();
    const result = await repo.createWithInventory(order);

    expect(result.kind).toBe("out_of_stock");
    if (result.kind === "out_of_stock") {
      expect(result.sku).toBe("TEST-SKU-001");
      expect(result.available).toBe(0);
      expect(result.requested).toBe(1);
    }
  });

  it("returns product_not_found when RPC reports PRODUCT_NOT_FOUND", async () => {
    const { rpcMock } = createMockDb();
    const order = makeOrder("ord_404_001");

    rpcMock.mockResolvedValueOnce({
      data: { ok: false, error: "PRODUCT_NOT_FOUND", sku: "MISSING-SKU" },
      error: null,
    });

    const repo = new SupabaseOrderRepository();
    const result = await repo.createWithInventory(order);

    expect(result.kind).toBe("product_not_found");
    if (result.kind === "product_not_found") {
      expect(result.sku).toBe("MISSING-SKU");
    }
  });

  it("returns idempotent when RPC returns existing order", async () => {
    const { rpcMock, fromMock } = createMockDb();
    const order = makeOrder("ord_idem_001");

    rpcMock.mockResolvedValueOnce({
      data: { ok: true, orderId: "ord_idem_existing", idempotent: true },
      error: null,
    });

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValueOnce({
      data: makeDbRow({ ...order, id: "ord_idem_existing" }),
      error: null,
    });
    fromMock.mockReturnValue({ select: selectMock, eq: eqMock, single: singleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });

    const repo = new SupabaseOrderRepository();
    const result = await repo.createWithInventory(order, "idem-key-existing");

    expect(result.kind).toBe("idempotent");
    if (result.kind === "idempotent") {
      expect(result.order.id).toBe("ord_idem_existing");
    }
  });

  it("throws when Supabase returns an error", async () => {
    const { rpcMock } = createMockDb();
    const order = makeOrder("ord_err_001");

    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "connection timeout" },
    });

    const repo = new SupabaseOrderRepository();
    await expect(repo.createWithInventory(order)).rejects.toThrow("Order creation failed");
  });
});

describe("SupabaseOrderRepository — releaseOrderInventory", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls release_order_inventory RPC with the order ID", async () => {
    const { rpcMock } = createMockDb();
    rpcMock.mockResolvedValueOnce({ data: null, error: null });

    const repo = new SupabaseOrderRepository();
    await repo.releaseOrderInventory("ord_release_001");

    expect(rpcMock).toHaveBeenCalledWith("release_order_inventory", { p_order_id: "ord_release_001" });
  });

  it("does not throw when RPC returns an error (logs only)", async () => {
    const { rpcMock } = createMockDb();
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "db error" } });

    const repo = new SupabaseOrderRepository();
    await expect(repo.releaseOrderInventory("ord_err_002")).resolves.toBeUndefined();
  });
});

describe("SupabaseOrderRepository — recordWebhookEvent", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns true when RPC reports newly recorded event", async () => {
    const { rpcMock } = createMockDb();
    rpcMock.mockResolvedValueOnce({ data: true, error: null });

    const repo = new SupabaseOrderRepository();
    const result = await repo.recordWebhookEvent("pay_123:captured", "payment.captured", "ord_001");
    expect(result).toBe(true);
  });

  it("returns false when RPC reports duplicate event", async () => {
    const { rpcMock } = createMockDb();
    rpcMock.mockResolvedValueOnce({ data: false, error: null });

    const repo = new SupabaseOrderRepository();
    const result = await repo.recordWebhookEvent("pay_123:captured", "payment.captured", "ord_001");
    expect(result).toBe(false);
  });

  it("returns false (fail-safe) when RPC returns an error", async () => {
    const { rpcMock } = createMockDb();
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "db error" } });

    const repo = new SupabaseOrderRepository();
    const result = await repo.recordWebhookEvent("pay_456:captured", "payment.captured", "ord_002");
    expect(result).toBe(false); // fail-safe: skip processing, don't crash
  });
});

describe("SupabaseOrderRepository — findById", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns null when order is not found", async () => {
    const { fromMock } = createMockDb();
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    fromMock.mockReturnValue({ select: selectMock, eq: eqMock, single: singleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });

    const repo = new SupabaseOrderRepository();
    const result = await repo.findById("ord_nonexistent");
    expect(result).toBeNull();
  });

  it("maps database row to Order type correctly", async () => {
    const { fromMock } = createMockDb();
    const order = makeOrder("ord_mapped_001");
    const row = makeDbRow(order);

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValueOnce({ data: row, error: null });
    fromMock.mockReturnValue({ select: selectMock, eq: eqMock, single: singleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });

    const repo = new SupabaseOrderRepository();
    const result = await repo.findById("ord_mapped_001");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("ord_mapped_001");
    expect(result?.customer.email).toBe("test@example.com");
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.sku).toBe("TEST-SKU-001");
    expect(result?.currency).toBe("INR");
  });
});
