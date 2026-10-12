"use client";

import * as React from "react";

import { postCartSync } from "@/modules/abandoned-cart/client";
import { useCart } from "@/modules/cart/use-cart";

const DEBOUNCE_MS = 2000;

/**
 * Mirrors the bag to the server (debounced) so a reminder can be sent if it
 * is abandoned. Renders nothing. Identity and consent are attached later by
 * the checkout form or the signed-in session; this only ever sends items.
 */
export function CartSync() {
  const { lines } = useCart();
  const timer = React.useRef<number | null>(null);
  const hadItems = React.useRef(false);

  React.useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (lines.length === 0) {
      // Only tell the server when a bag we previously synced has been emptied.
      if (hadItems.current) {
        hadItems.current = false;
        void postCartSync({ items: [] });
      }
      return;
    }
    hadItems.current = true;
    timer.current = window.setTimeout(() => {
      void postCartSync({ items: [...lines] });
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lines]);

  return null;
}
