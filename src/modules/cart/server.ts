import "server-only";

import { getDb } from "@/db/client";
import { getSessionUserId } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";

import { getCartToken } from "./cookies";
import { createCartService, type CartService } from "./service";

export type CartContext =
  | { configured: false }
  | { configured: true; service: CartService; profileId: string | null; token: string | null };

/** Per-request cart context. `configured: false` when no database is set up. */
export async function getCartContext(): Promise<CartContext> {
  if (!getServerEnv().DATABASE_URL) return { configured: false };
  const [profileId, token] = await Promise.all([getSessionUserId(), getCartToken()]);
  return { configured: true, service: createCartService(getDb()), profileId, token };
}
