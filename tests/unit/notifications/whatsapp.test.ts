/**
 * WhatsApp order confirmation: phone normalisation, template parameters and
 * the Cloud API transport (fetch mocked). A failure must never throw.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Order } from "@/modules/orders/types";
import { sendWhatsAppTemplate } from "@/modules/whatsapp/cloud-api";
import { orderConfirmedParams, toWhatsAppNumber } from "@/modules/whatsapp/order-confirmation";

const order: Order = {
  id: "ord_abc",
  orderNumber: 1042,
  status: "PAID",
  customer: { name: "  Priya   Sharma ", email: "priya@example.com", phone: "9876543210" },
  shippingAddress: { name: "Priya Sharma", phone: "9876543210", line1: "1 MG Road", city: "Rajkot", state: "Gujarat", pincode: "360001", country: "India" },
  items: [
    { sku: "EAR-1", productId: "p1", productName: "Pearl Drop Earrings", quantity: 1, unitPricePaise: 129900, lineTotalPaise: 129900, gstRateBp: 300, hsnCode: "7117" },
    { sku: "RING-7", productId: "p2", productName: "Solitaire Ring", variantOptionValue: "12", quantity: 2, unitPricePaise: 49900, lineTotalPaise: 99800, gstRateBp: 300, hsnCode: "7117" },
  ],
  subtotalPaise: 229700,
  discountPaise: 0,
  shippingPaise: 0,
  gstPaise: 6690,
  totalPaise: 229700,
  coupon: null,
  razorpayOrderId: "order_x",
  currency: "INR",
  createdAt: "2026-10-10T00:00:00Z",
  updatedAt: "2026-10-10T00:00:00Z",
};

describe("toWhatsAppNumber", () => {
  it("accepts the 10-digit Indian mobile captured at checkout and common prefixes", () => {
    expect(toWhatsAppNumber("9876543210")).toBe("919876543210");
    expect(toWhatsAppNumber("+91 98765 43210")).toBe("919876543210");
    expect(toWhatsAppNumber("09876543210")).toBe("919876543210");
    expect(toWhatsAppNumber("0091-9876543210")).toBe("919876543210");
  });

  it("rejects numbers that cannot be an Indian mobile", () => {
    expect(toWhatsAppNumber("1234567890")).toBeNull();
    expect(toWhatsAppNumber("98765")).toBeNull();
    expect(toWhatsAppNumber("+44 7700 900123")).toBeNull();
  });
});

describe("orderConfirmedParams", () => {
  it("fills first name, reference, total and an items summary without line breaks", () => {
    const [name, ref, total, items] = orderConfirmedParams(order);
    expect(name).toBe("Priya");
    expect(ref).toBe("KL-1042");
    expect(total).toBe("₹2,297");
    expect(items).toBe("Pearl Drop Earrings × 1, Solitaire Ring (12) × 2");
    expect(items).not.toMatch(/\n|\s{2,}/);
  });

  it("keeps a long items list within the template limit", () => {
    const many = { ...order, items: Array.from({ length: 12 }, (_, i) => ({ ...order.items[0]!, sku: `S-${i}`, productName: `Hand-finished Kundan Statement Necklace number ${i}` })) };
    const items = orderConfirmedParams(many)[3];
    expect(items.length).toBeLessThanOrEqual(200);
    expect(items).toMatch(/and \d+ more$/);
  });
});

describe("sendWhatsAppTemplate", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("is skipped, not failed, when the credentials are not set", async () => {
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    const result = await sendWhatsAppTemplate({ to: "919876543210", template: "order_confirmed", language: "en", bodyParams: ["a"] });
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts an approved template with body parameters to the sender's phone number id", async () => {
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "EAAG-test-token-0000000000");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789012345");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }));

    const result = await sendWhatsAppTemplate({ to: "919876543210", template: "order_confirmed", language: "en", bodyParams: ["Priya", "KL-1042"] });

    expect(result).toEqual({ ok: true, id: "wamid.1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/123456789012345\/messages$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer EAAG-test-token-0000000000");
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "919876543210",
      type: "template",
      template: {
        name: "order_confirmed",
        language: { code: "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Priya" }, { type: "text", text: "KL-1042" }] }],
      },
    });
  });

  it("reports Meta's error message and never throws", async () => {
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "EAAG-test-token-0000000000");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789012345");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: "Template name does not exist in the translation", code: 132001 } }), { status: 400 }));
    expect(await sendWhatsAppTemplate({ to: "919876543210", template: "nope", language: "en", bodyParams: [] })).toEqual({ ok: false, error: "Template name does not exist in the translation" });

    fetchMock.mockRejectedValue(new Error("socket hang up"));
    expect(await sendWhatsAppTemplate({ to: "919876543210", template: "nope", language: "en", bodyParams: [] })).toEqual({ ok: false, error: "socket hang up" });
  });
});
