"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getServerWishlistSnapshot, localWishlistStore } from "./store";

/** React binding over the wishlist store. */
export function useWishlist() {
  const slugs = useSyncExternalStore(localWishlistStore.subscribe, localWishlistStore.getSnapshot, getServerWishlistSnapshot);
  const toggle = useCallback((slug: string) => localWishlistStore.toggle(slug), []);
  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);
  return { slugs, count: slugs.length, toggle, has };
}
