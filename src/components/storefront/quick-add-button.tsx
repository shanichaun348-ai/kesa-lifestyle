"use client";

import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

type QuickAddButtonProps = {
  sku: string;
  productName: string;
  className?: string;
};

/** Quick add for single-variant products; writes to the server bag. */
export function QuickAddButton({ sku, productName, className }: QuickAddButtonProps) {
  const cart = useCart();
  return (
    <button
      type="button"
      aria-label={`Add ${productName} to bag`}
      disabled={cart.pending}
      onClick={() => void cart.add(sku, 1).then((ok) => ok && toast.success("Added to bag", { description: productName }))}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg shadow-(--shadow-float)",
        "transition-[opacity,transform] duration-250 ease-(--ease-standard) disabled:opacity-60",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <PlusIcon className="size-4" aria-hidden="true" />
      Add
    </button>
  );
}
