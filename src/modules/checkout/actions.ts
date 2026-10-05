"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";

import { stateName } from "@/lib/india-states";
import { grantOrderAccess } from "@/modules/cart/cookies";
import { getCartContext } from "@/modules/cart/server";

import { confirmPaymentSchema, placeOrderSchema, type PlaceOrderFormInput } from "./schemas";
import { getCheckoutService } from "./server";
import { CheckoutError, type PlaceOrderResult } from "./service";

export type PlaceOrderActionResult =
  | { ok: true; result: PlaceOrderResult }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> | undefined };

export type ConfirmPaymentActionResult = { ok: true; status: "paid" | "pending" | "failed" } | { ok: false; code: string; message: string };

async function requestMeta(): Promise<{ ipHash: string | undefined; userAgent: string | undefined }> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : undefined;
    return { ipHash, userAgent: h.get("user-agent")?.slice(0, 200) ?? undefined };
  } catch {
    return { ipHash: undefined, userAgent: undefined };
  }
}

export async function placeOrderAction(input: PlaceOrderFormInput): Promise<PlaceOrderActionResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors };
  }
  const ctx = await getCartContext();
  const service = getCheckoutService();
  if (!ctx.configured || !service) return { ok: false, code: "not_configured", message: "The store database is not configured yet." };

  const cart = await ctx.service.resolve({ token: ctx.token, profileId: ctx.profileId, create: false });
  if (!cart) return { ok: false, code: "cart_empty", message: "Your bag is empty." };

  const data = parsed.data;
  const toAddress = (a: typeof data.shippingAddress) => ({
    fullName: a.fullName,
    phone: `+91${a.phone}`,
    line1: a.line1,
    line2: a.line2,
    landmark: a.landmark,
    city: a.city,
    state: stateName(a.stateCode),
    stateCode: a.stateCode,
    pincode: a.pincode,
  });
  const meta = await requestMeta();

  try {
    const result = await service.placeOrder({
      cartId: cart.id,
      profileId: ctx.profileId,
      idempotencyKey: data.idempotencyKey,
      contact: { email: data.contact.email.toLowerCase(), phone: `+91${data.contact.phone}` },
      shippingAddress: toAddress(data.shippingAddress),
      billingAddress: data.billingSameAsShipping || !data.billingAddress ? undefined : toAddress(data.billingAddress),
      shippingMethod: data.shippingMethod,
      paymentMethod: data.paymentMethod,
      giftWrap: data.giftWrap,
      giftMessage: data.giftMessage,
      pincodeCodAvailable: data.pincodeCodAvailable ?? null,
      gaClientId: data.gaClientId,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
    });
    await grantOrderAccess(result.orderNumber);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, code: error.code, message: error.message };
    console.error("[checkout] place order failed", error);
    return { ok: false, code: "unexpected", message: "We could not place your order. Nothing has been charged. Please try again." };
  }
}

export async function confirmRazorpayPaymentAction(input: unknown): Promise<ConfirmPaymentActionResult> {
  const parsed = confirmPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Invalid payment response." };
  const service = getCheckoutService();
  if (!service) return { ok: false, code: "not_configured", message: "The store database is not configured yet." };
  try {
    const result = await service.confirmCheckoutCallback({
      orderNumber: parsed.data.orderNumber,
      providerOrderId: parsed.data.razorpayOrderId,
      providerPaymentId: parsed.data.razorpayPaymentId,
      signature: parsed.data.razorpaySignature,
    });
    return { ok: true, status: result.status };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, code: error.code, message: error.message };
    console.error("[checkout] confirm payment failed", error);
    return { ok: false, code: "unexpected", message: "We could not confirm the payment yet. If money was deducted, it will be reconciled automatically." };
  }
}
