import type { CartLine } from "@/modules/cart/store";

export const CART_COOKIE = "kesa_cart";
export const CART_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export type CartStatus = "open" | "converted" | "reminded" | "unsubscribed" | "expired";

export type AbandonedCart = {
  id: string;
  token: string;
  email: string | null;
  phone: string | null;
  profileId: string | null;
  consent: boolean;
  items: CartLine[];
  subtotalPaise: number;
  status: CartStatus;
  reminderCount: number;
  lastRemindedAt: string | null;
  convertedOrderId: string | null;
  lastActivityAt: string;
};

/** Payload the browser sends to /api/cart/sync/. */
export type CartSyncInput = {
  items: CartLine[];
  email?: string | undefined;
  phone?: string | undefined;
  consent?: boolean | undefined;
};
