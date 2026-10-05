import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Cards are hairline-bordered surfaces with no shadow (docs/09 §1).
 * Use `padding="none"` for image-led cards where the media bleeds to the edge.
 */
function Card({
  className,
  padding = "md",
  ...props
}: React.ComponentProps<"div"> & { padding?: "none" | "sm" | "md" }) {
  return (
    <div
      data-slot="card"
      data-padding={padding}
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-md border border-line bg-surface text-ink",
        padding === "md" && "[--card-pad:--spacing(6)]",
        padding === "sm" && "[--card-pad:--spacing(4)]",
        padding === "none" && "[--card-pad:0px]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-(--card-pad) pt-(--card-pad)", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("type-h3", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="card-description" className={cn("type-small text-ink-muted", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-pad) py-(--card-pad) group-has-[[data-slot=card-header]]/card:pt-4", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 border-t border-line px-(--card-pad) py-4", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
