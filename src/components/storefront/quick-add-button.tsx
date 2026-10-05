"use client";

import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type QuickAddButtonProps = {
  productName: string;
  className?: string;
};

/**
 * Quick add for single-variant products. The cart action is wired in Phase 2;
 * for now it only reports the intent so the interaction can be reviewed.
 */
export function QuickAddButton({ productName, className }: QuickAddButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Add ${productName} to bag`}
      onClick={() => toast.success("Added to bag", { description: productName })}
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
