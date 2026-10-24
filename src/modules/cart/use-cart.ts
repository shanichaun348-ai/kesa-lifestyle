"use client";

import { useMemo, useSyncExternalStore } from "react";

import { cartTotals, getServerCartSnapshot, localCartStore } from "./store";

/** React binding over the bag store. */
export function useCart() {
  const lines = useSyncExternalStore(localCartStore.subscribe, localCartStore.getSnapshot, getServerCartSnapshot);
  const totals = useMemo(() => cartTotals(lines), [lines]);
  return {
    lines,
    count: totals.count,
    subtotalPaise: totals.subtotalPaise,
    add: localCartStore.add,
    ensure: localCartStore.ensure,
    setQuantity: localCartStore.setQuantity,
    remove: localCartStore.remove,
    clear: localCartStore.clear,
  };
}
