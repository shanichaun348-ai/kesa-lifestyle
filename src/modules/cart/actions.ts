"use server";

import { z } from "zod";

import { setCartToken } from "./cookies";
import { getCartContext } from "./server";
import { CartError, type CartView, type CartViewOptions } from "./service";

export type CartActionResult = { ok: true; cart: CartView } | { ok: false; code: string; message: string };

const NOT_CONFIGURED: CartActionResult = { ok: false, code: "not_configured", message: "The store database is not configured yet." };

const skuSchema = z.string().regex(/^[A-Z0-9-]{3,64}$/);
const quantitySchema = z.number().int().min(0).max(10);
const quoteSchema = z.object({
  shippingMethod: z.enum(["standard", "express"]).optional(),
  paymentMethod: z.enum(["razorpay", "cod"]).optional(),
  giftWrap: z.boolean().optional(),
  destinationStateCode: z.string().length(2).nullable().optional(),
});

function fail(error: unknown): CartActionResult {
  if (error instanceof CartError) return { ok: false, code: error.code, message: error.message };
  console.error("[cart] unexpected error", error);
  return { ok: false, code: "unexpected", message: "Something went wrong updating your bag. Please try again." };
}

async function withCart(create: boolean, fn: (cartId: string | null, ctx: Extract<Awaited<ReturnType<typeof getCartContext>>, { configured: true }>) => Promise<void>, view?: CartViewOptions): Promise<CartActionResult> {
  const ctx = await getCartContext();
  if (!ctx.configured) return NOT_CONFIGURED;
  try {
    const cart = await ctx.service.resolve({ token: ctx.token, profileId: ctx.profileId, create });
    if (cart && cart.token !== ctx.token) await setCartToken(cart.token);
    await fn(cart?.id ?? null, ctx);
    return { ok: true, cart: await ctx.service.getView(cart?.id ?? null, { ...view, profileId: ctx.profileId }) };
  } catch (error) {
    return fail(error);
  }
}

export async function getCartAction(): Promise<CartActionResult> {
  return withCart(false, async () => undefined);
}

export async function quoteCartAction(input: z.input<typeof quoteSchema>): Promise<CartActionResult> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Invalid quote options." };
  return withCart(false, async () => undefined, parsed.data);
}

export async function addToCartAction(input: { sku: string; quantity: number }): Promise<CartActionResult> {
  const sku = skuSchema.safeParse(input.sku);
  const quantity = quantitySchema.safeParse(input.quantity);
  if (!sku.success || !quantity.success || quantity.data < 1) return { ok: false, code: "invalid_input", message: "Invalid item." };
  return withCart(true, async (cartId, ctx) => {
    if (!cartId) throw new CartError("not_found", "Cart unavailable");
    await ctx.service.addItem(cartId, sku.data, quantity.data);
  });
}

export async function setCartQuantityAction(input: { sku: string; quantity: number }): Promise<CartActionResult> {
  const sku = skuSchema.safeParse(input.sku);
  const quantity = quantitySchema.safeParse(input.quantity);
  if (!sku.success || !quantity.success) return { ok: false, code: "invalid_input", message: "Invalid quantity." };
  return withCart(false, async (cartId, ctx) => {
    if (cartId) await ctx.service.setQuantity(cartId, sku.data, quantity.data);
  });
}

export async function removeCartItemAction(input: { sku: string }): Promise<CartActionResult> {
  const sku = skuSchema.safeParse(input.sku);
  if (!sku.success) return { ok: false, code: "invalid_input", message: "Invalid item." };
  return withCart(false, async (cartId, ctx) => {
    if (cartId) await ctx.service.removeItem(cartId, sku.data);
  });
}

export async function applyCouponAction(input: { code: string }): Promise<CartActionResult> {
  const code = z.string().trim().min(3).max(32).safeParse(input.code);
  if (!code.success) return { ok: false, code: "invalid_input", message: "Enter a valid code." };
  return withCart(false, async (cartId, ctx) => {
    if (!cartId) throw new CartError("not_found", "Add something to your bag first.");
    await ctx.service.applyCoupon(cartId, code.data);
  });
}

export async function removeCouponAction(): Promise<CartActionResult> {
  return withCart(false, async (cartId, ctx) => {
    if (cartId) await ctx.service.removeCoupon(cartId);
  });
}
