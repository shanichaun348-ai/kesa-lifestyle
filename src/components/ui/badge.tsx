import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Badges are quiet: uppercase eyebrow type, hairline or tint, no fills except
 * `solid`, which is reserved for a single emphasised state (e.g. "Sold out").
 */
const badgeVariants = cva(
  "type-eyebrow inline-flex h-6 w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-2 [&>svg]:size-3",
  {
    variants: {
      variant: {
        outline: "border-line-strong bg-surface text-ink",
        solid: "border-ink bg-ink text-bg",
        muted: "border-transparent bg-surface-muted text-ink-muted",
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        danger: "border-transparent bg-danger/10 text-danger",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

function Badge({
  className,
  variant = "outline",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
