import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Centered spinner with a visually hidden label; use for small dynamic regions. */
export function LoadingBlock({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-10 text-ink-muted", className)} role="status" aria-live="polite">
      <Spinner className="size-5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
