import { NextResponse } from "next/server";

import { getCartContext } from "@/modules/cart/server";

export const dynamic = "force-dynamic";

/** GET /api/cart/ — the current bag for the CartProvider. Never cached. */
export async function GET() {
  const ctx = await getCartContext();
  if (!ctx.configured) return NextResponse.json({ configured: false, cart: null }, { headers: { "Cache-Control": "private, no-store" } });
  const cart = await ctx.service.resolve({ token: ctx.token, profileId: ctx.profileId, create: false });
  const view = await ctx.service.getView(cart?.id ?? null, { profileId: ctx.profileId });
  return NextResponse.json({ configured: true, cart: view }, { headers: { "Cache-Control": "private, no-store" } });
}
