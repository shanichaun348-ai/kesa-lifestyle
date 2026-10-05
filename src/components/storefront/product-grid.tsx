import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 2 columns at 360px, 3 at ≥768px, 4 at ≥1200px (docs/09 §4).
 * Children are expected to be <li> elements.
 */
export function ProductGrid({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 xl:grid-cols-4", className)}
      {...props}
    />
  );
}
