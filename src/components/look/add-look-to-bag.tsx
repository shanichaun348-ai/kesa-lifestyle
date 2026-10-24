"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShoppingBagIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { localCartStore } from "@/modules/cart/store";
import { useCart } from "@/modules/cart/use-cart";
import { trackAddToCart, trackBeginCheckout } from "@/modules/analytics/events";
import type { LookPiece } from "@/modules/content/look-bag";
import { cn } from "@/lib/utils";

type Props = {
  pieces: readonly LookPiece[];
  className?: string;
};

/**
 * "Add the look to bag" and "Buy the full look": every available piece goes
 * into the bag in one tap (one of each, capped by stock), then the shopper
 * either stays with a toast or goes straight to checkout.
 */
export function AddLookToBag({ pieces, className }: Props) {
  const cart = useCart();
  const router = useRouter();
  const [busy, setBusy] = React.useState<"bag" | "checkout" | null>(null);
  const lines = pieces.flatMap((p) => (p.line ? [{ piece: p, line: p.line }] : []));

  /** "add" stacks (Add to bag); "ensure" is Buy now and never doubles a piece that is already in the bag. */
  function addAll(mode: "add" | "ensure"): number {
    let added = 0;
    for (const { piece, line } of lines) {
      if (line.maxQuantity < 1) continue;
      const { maxQuantity, ...bagLine } = line;
      const alreadyInBag = cart.lines.some((l) => l.sku === line.sku);
      if (mode === "ensure") cart.ensure(bagLine, 1, maxQuantity);
      else cart.add(bagLine, 1, maxQuantity);
      added += 1;
      if (mode === "ensure" && alreadyInBag) continue;
      trackAddToCart({ sku: line.sku, productName: line.name, pricePaise: line.unitPricePaise, quantity: 1, categoryPath: piece.categoryPath, optionLabel: line.optionLabel });
    }
    return added;
  }

  function onAddToBag() {
    setBusy("bag");
    const added = addAll("add");
    setBusy(null);
    if (added === 0) {
      toast.error("These pieces are sold out right now.");
      return;
    }
    toast.success(added === 1 ? "Added to bag" : `${added} pieces added to bag`, {
      description: "The full look is in your bag.",
      action: { label: "View bag", onClick: () => router.push("/cart/") },
    });
  }

  function onBuyNow() {
    setBusy("checkout");
    const added = addAll("ensure");
    if (added === 0) {
      setBusy(null);
      toast.error("These pieces are sold out right now.");
      return;
    }
    // Straight to checkout, so the checkout start is reported here (bag snapshot after the adds).
    trackBeginCheckout(
      localCartStore.getSnapshot().map((l) => ({
        sku: l.sku,
        name: l.name,
        unitPricePaise: l.unitPricePaise,
        quantity: l.quantity,
        ...(l.optionLabel ? { optionLabel: l.optionLabel } : {}),
      })),
    );
    router.push("/checkout/");
  }

  const none = lines.length === 0;

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <Button type="button" size="lg" onClick={onBuyNow} disabled={none || busy !== null} className="flex-1">
        <ShoppingBagIcon aria-hidden="true" />
        {busy === "checkout" ? "Taking you to checkout…" : "Buy the full look"}
      </Button>
      <Button type="button" variant="secondary" size="lg" onClick={onAddToBag} disabled={none || busy !== null} className="flex-1">
        {busy === "bag" ? "Adding…" : "Add all to bag"}
      </Button>
    </div>
  );
}
