import "server-only";

import { cookies } from "next/headers";

const CART_COOKIE = "kesa_cart";
const ORDERS_COOKIE = "kesa_orders";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const baseOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function getCartToken(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value ?? null;
  return value && UUID.test(value) ? value : null;
}

/** Only callable from Server Actions / Route Handlers (cookies are read-only in Server Components). */
export async function setCartToken(token: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, token, { ...baseOptions, maxAge: THIRTY_DAYS });
}

/** Guest access to their own order pages: order numbers placed in this browser. */
export async function getAccessibleOrderNumbers(): Promise<string[]> {
  const raw = (await cookies()).get(ORDERS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string" && /^KL-\d+$/.test(v)).slice(0, 10) : [];
  } catch {
    return [];
  }
}

export async function grantOrderAccess(orderNumber: string): Promise<void> {
  const current = await getAccessibleOrderNumbers();
  const next = [orderNumber, ...current.filter((n) => n !== orderNumber)].slice(0, 10);
  (await cookies()).set(ORDERS_COOKIE, JSON.stringify(next), { ...baseOptions, maxAge: THIRTY_DAYS });
}
