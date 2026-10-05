import { cn } from "@/lib/utils";

/* Quiet shimmer-free placeholder; only used for dynamic islands (docs/09 §6). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-surface-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
