import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { consumeMemoryRateLimit, limiterKey } from "@/lib/rate-limit-memory";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cartSyncSchema } from "@/modules/abandoned-cart/schemas";
import { deleteCart, newCartToken, profileConsent, upsertCart } from "@/modules/abandoned-cart/store";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "@/modules/abandoned-cart/types";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const TOKEN_RE = /^[a-f0-9]{32}$/;

function clientKey(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * POST /api/cart/sync/ — keep a server copy of the bag so a reminder can be
 * sent if it is abandoned. Anonymous syncs carry items only; identity and
 * consent arrive from checkout or the signed-in session. An empty bag
 * removes the copy.
 */
export async function POST(request: NextRequest) {
  const noStore = { headers: { "Cache-Control": "private, no-store" } };
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, skipped: true }, noStore);

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return NextResponse.json({ error: "Bag too large." }, { status: 413, ...noStore });

  const limit = consumeMemoryRateLimit(limiterKey("cart-sync", clientKey(request)), 60, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, ...noStore });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, ...noStore });
  }
  const parsed = cartSyncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid bag." }, { status: 400, ...noStore });
  const input = parsed.data;

  const existingToken = request.cookies.get(CART_COOKIE)?.value;
  const token = existingToken && TOKEN_RE.test(existingToken) ? existingToken : null;

  if (input.items.length === 0) {
    if (token) await deleteCart(token);
    return NextResponse.json({ ok: true }, noStore);
  }

  const session = await getSessionUser();
  // A signed-in shopper's bag can only ever be tied to their own address.
  const sessionEmail = session?.email?.toLowerCase();
  let email = sessionEmail ?? input.email ?? undefined;
  let consent = input.consent ?? (session?.id && !input.email ? await profileConsent(session.id) : undefined);
  if (sessionEmail && input.email && input.email !== sessionEmail) {
    email = sessionEmail;
    consent = undefined;
  }
  // Guests may attach an address only with consent from checkout, and only a few addresses per
  // network per day, so a script cannot enrol strangers for store-branded reminders in bulk.
  if (!sessionEmail && input.email) {
    const enrol = consumeMemoryRateLimit(limiterKey("cart-enrol", clientKey(request)), 5, 24 * 60 * 60);
    if (!enrol.allowed) {
      email = undefined;
      consent = undefined;
    }
  }

  const cartToken = token ?? newCartToken();
  await upsertCart({ token: cartToken, items: input.items, email, phone: input.phone, consent, profileId: session?.id ?? null });

  const response = NextResponse.json({ ok: true }, noStore);
  if (!token) {
    response.cookies.set(CART_COOKIE, cartToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }
  return response;
}
