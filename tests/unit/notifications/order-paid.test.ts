/**
 * notifyOrderPaid fans out to email, WhatsApp and the shop inbox. Channels are
 * independent: one failing or unconfigured channel never blocks another, and
 * an admin re-send targets a single channel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Order } from "@/modules/orders/types";

vi.mock("@/modules/email/resend", () => ({ sendEmail: vi.fn(async () => ({ ok: true, id: "email-1" })) }));
vi.mock("@/modules/whatsapp/cloud-api", () => ({ sendWhatsAppTemplate: vi.fn(async () => ({ ok: true, id: "wamid.1" })) }));

import { sendEmail } from "@/modules/email/resend";
import { sendWhatsAppTemplate } from "@/modules/whatsapp/cloud-api";
import { notifyOrderPaid } from "@/modules/notifications/order-paid";

const order: Order = {
  id: "ord_abc",
  orderNumber: 7,
  status: "PAID",
  customer: { name: "Priya Sharma", email: "priya@example.com", phone: "9876543210" },
  shippingAddress: { name: "Priya Sharma", phone: "9876543210", line1: "1 MG Road", city: "Rajkot", state: "Gujarat", pincode: "360001", country: "India" },
  items: [{ sku: "EAR-1", productId: "p1", productName: "Pearl Drop Earrings", quantity: 1, unitPricePaise: 129900, lineTotalPaise: 129900, gstRateBp: 300, hsnCode: "7117" }],
  subtotalPaise: 129900,
  discountPaise: 0,
  shippingPaise: 0,
  gstPaise: 3784,
  totalPaise: 129900,
  coupon: null,
  razorpayOrderId: "order_x",
  currency: "INR",
  createdAt: "2026-10-10T00:00:00Z",
  updatedAt: "2026-10-10T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ORDER_NOTIFY_EMAIL", "shop@example.com");
  vi.stubEnv("WHATSAPP_ORDER_TEMPLATE", "");
  vi.stubEnv("WHATSAPP_TEMPLATE_LANGUAGE", "");
});

afterEach(() => vi.unstubAllEnvs());

describe("notifyOrderPaid", () => {
  it("sends the customer email, the WhatsApp template and the shop alert after payment", async () => {
    const result = await notifyOrderPaid(order);

    expect(result.customer).toEqual({ ok: true, id: "email-1" });
    expect(result.admin).toEqual({ ok: true, id: "email-1" });
    expect(result.whatsapp).toEqual({ ok: true, id: "wamid.1" });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendEmail).mock.calls[0]?.[0]).toMatchObject({ to: "priya@example.com", subject: expect.stringContaining("KL-7") });
    expect(vi.mocked(sendEmail).mock.calls[1]?.[0]).toMatchObject({ to: "shop@example.com" });
    expect(vi.mocked(sendWhatsAppTemplate)).toHaveBeenCalledWith({
      to: "919876543210",
      template: "order_confirmed",
      language: "en",
      bodyParams: ["Priya", "KL-7", "₹1,299", "Pearl Drop Earrings × 1"],
    });
  });

  it("uses the configured template name and language", async () => {
    vi.stubEnv("WHATSAPP_ORDER_TEMPLATE", "kesa_order_ok");
    vi.stubEnv("WHATSAPP_TEMPLATE_LANGUAGE", "en_US");
    await notifyOrderPaid(order);
    expect(vi.mocked(sendWhatsAppTemplate).mock.calls[0]?.[0]).toMatchObject({ template: "kesa_order_ok", language: "en_US" });
  });

  it("re-sends one channel only when an admin asks, with no shop alert", async () => {
    const email = await notifyOrderPaid(order, { only: "email" });
    expect(email.whatsapp).toBeNull();
    expect(email.admin).toBeNull();
    expect(vi.mocked(sendWhatsAppTemplate)).not.toHaveBeenCalled();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    const wa = await notifyOrderPaid(order, { only: "whatsapp" });
    expect(wa.whatsapp).toEqual({ ok: true, id: "wamid.1" });
    expect(wa.customer).toMatchObject({ ok: false, skipped: true });
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("skips WhatsApp for an undeliverable number while the email still goes out", async () => {
    const result = await notifyOrderPaid({ ...order, customer: { ...order.customer, phone: "12345" } }, { customerOnly: true });
    expect(result.customer.ok).toBe(true);
    expect(result.whatsapp).toMatchObject({ ok: false, skipped: true });
    expect(vi.mocked(sendWhatsAppTemplate)).not.toHaveBeenCalled();
  });

  it("lets a WhatsApp failure stand on its own", async () => {
    vi.mocked(sendWhatsAppTemplate).mockResolvedValueOnce({ ok: false, error: "Template paused" });
    const result = await notifyOrderPaid(order);
    expect(result.customer.ok).toBe(true);
    expect(result.whatsapp).toEqual({ ok: false, error: "Template paused" });
  });
});
