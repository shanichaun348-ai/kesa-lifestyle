"use client";

import * as React from "react";
import { toast } from "sonner";

import { addToCartAction, applyCouponAction, getCartAction, removeCartItemAction, removeCouponAction, setCartQuantityAction, type CartActionResult } from "@/modules/cart/actions";
import type { CartView } from "@/modules/cart/service";

type CartContextValue = {
  cart: CartView | null;
  /** True once the first load finished. */
  ready: boolean;
  /** True when the server has no database configured. */
  notConfigured: boolean;
  pending: boolean;
  itemCount: number;
  refresh: () => Promise<void>;
  add: (sku: string, quantity: number) => Promise<boolean>;
  setQuantity: (sku: string, quantity: number) => Promise<boolean>;
  remove: (sku: string) => Promise<boolean>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<boolean>;
};

const CartContext = React.createContext<CartContextValue | null>(null);

/**
 * Client bag state. The server owns the cart; this context mirrors the last
 * view returned by a server action or `/api/cart/`. Pages stay static because
 * the bag is fetched after hydration rather than rendered into cached HTML.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartView | null>(null);
  const [ready, setReady] = React.useState(false);
  const [notConfigured, setNotConfigured] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const applyResult = React.useCallback((result: CartActionResult): boolean => {
    if (result.ok) {
      setCart(result.cart);
      setNotConfigured(false);
      return true;
    }
    if (result.code === "not_configured") setNotConfigured(true);
    toast.error(result.message);
    return false;
  }, []);

  const refresh = React.useCallback(async () => {
    const result = await getCartAction();
    if (result.ok) setCart(result.cart);
    else if (result.code === "not_configured") setNotConfigured(true);
    setReady(true);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/cart/", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return;
        const data = (await res.json()) as { configured: boolean; cart: CartView | null };
        if (!data.configured) setNotConfigured(true);
        if (data.cart) setCart(data.cart);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = React.useCallback(
    (action: () => Promise<CartActionResult>) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          resolve(applyResult(await action()));
        });
      }),
    [applyResult],
  );

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      notConfigured,
      pending,
      itemCount: cart?.itemCount ?? 0,
      refresh,
      add: (sku, quantity) => run(() => addToCartAction({ sku, quantity })),
      setQuantity: (sku, quantity) => run(() => setCartQuantityAction({ sku, quantity })),
      remove: (sku) => run(() => removeCartItemAction({ sku })),
      applyCoupon: (code) => run(() => applyCouponAction({ code })),
      removeCoupon: () => run(() => removeCouponAction()),
    }),
    [cart, ready, notConfigured, pending, refresh, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
