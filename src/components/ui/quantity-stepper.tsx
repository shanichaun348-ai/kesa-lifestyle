"use client";

import { MinusIcon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/** Accessible quantity control: buttons plus an editable numeric input. */
export function QuantityStepper({ value, min = 1, max, onChange, label = "Quantity", size = "md", className }: QuantityStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : min));
  const h = size === "sm" ? "h-9" : "h-11";
  const btn = cn(
    "inline-flex aspect-square items-center justify-center text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40",
    "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
    h,
  );

  return (
    <div className={cn("inline-flex items-stretch rounded-sm border border-line-strong bg-surface", h, className)} role="group" aria-label={label}>
      <button type="button" className={btn} aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <MinusIcon className="size-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-12 border-x border-line-strong bg-transparent text-center text-sm tabular-nums text-ink outline-none [appearance:textfield] focus-visible:bg-surface-muted [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={btn} aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <PlusIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
