"use client";

import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { localCartStore } from "@/modules/cart/store";
import { MAX_QUANTITY_PER_LINE } from "@/modules/catalog/variants";

type QuickAddButtonProps = {
  productName: string;
  productSlug: string;
  sku: string;
  unitPricePaise: number;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
  className?: string;
};

export function QuickAddButton({ productName, productSlug, sku, unitPricePaise, image, className }: QuickAddButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Add ${productName} to bag`}
      onClick={() => {
        localCartStore.add({ sku, productSlug, name: productName, unitPricePaise, image }, 1, MAX_QUANTITY_PER_LINE);
        toast.success("Added to bag", { description: productName });
      }}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg shadow-(--shadow-float)",
        "transition-[opacity,transform] duration-250 ease-(--ease-standard)",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <PlusIcon className="size-4" aria-hidden="true" />
      Add
    </button>
  );
}
