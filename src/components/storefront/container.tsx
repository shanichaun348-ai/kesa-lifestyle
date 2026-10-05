import * as React from "react";

import { cn } from "@/lib/utils";

/** Page-width wrapper with responsive gutters (16 / 24 / 40px). */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("container-page", className)} {...props} />;
}
