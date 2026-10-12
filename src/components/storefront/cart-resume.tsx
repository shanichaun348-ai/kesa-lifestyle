"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { localCartStore, type CartLine } from "@/modules/cart/store";
import { MAX_QUANTITY_PER_LINE } from "@/modules/catalog/variants";

/**
 * Restores a bag from a reminder link (`/cart/?resume=token`): merges the
 * saved items into the local bag, says so, and removes the token from the
 * URL so a refresh does not merge again. Renders nothing.
 */
export function CartResume() {
  const params = useSearchParams();
  const pathname = usePathname();
  const token = params.get("resume");

  React.useEffect(() => {
    if (!token || !/^[a-f0-9]{32}$/.test(token)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cart/resume/?token=${token}`, { credentials: "same-origin" });
        const json = (await res.json()) as { items?: CartLine[]; error?: string };
        if (cancelled) return;
        if (!res.ok || !json.items) {
          toast.error(json.error ?? "That bag is no longer available.");
        } else {
          const have = new Set(localCartStore.getSnapshot().map((l) => l.sku));
          let added = 0;
          for (const line of json.items) {
            if (have.has(line.sku)) continue;
            const { quantity, ...rest } = line;
            localCartStore.add(rest, quantity, MAX_QUANTITY_PER_LINE);
            added += 1;
          }
          toast.success("Your bag is back", { description: added > 0 ? `${added} ${added === 1 ? "piece" : "pieces"} restored.` : "Everything was already here." });
        }
      } catch {
        if (!cancelled) toast.error("Could not restore your bag — please try again.");
      } finally {
        if (!cancelled) window.history.replaceState(window.history.state, "", pathname);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, pathname]);

  return null;
}
