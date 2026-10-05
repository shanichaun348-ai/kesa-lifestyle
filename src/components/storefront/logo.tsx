import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Typographic wordmark until final brand assets arrive (decision D12).
 * Rendered as text so it scales, stays crisp and is read by assistive tech.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Kesa Lifestyle home"
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
        className,
      )}
    >
      <span className="font-display text-2xl leading-none tracking-tight text-ink">Kesa</span>
      <span className="type-eyebrow hidden text-ink-muted sm:inline">Lifestyle</span>
    </Link>
  );
}
