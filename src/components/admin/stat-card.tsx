import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  /** Makes the whole card a link to the screen that lists what the number counts. */
  href?: string;
  className?: string;
};

export function StatCard({ label, value, sub, trend, href, className }: Props) {
  const card = cn("rounded-md border border-line bg-surface p-5", href && "block transition-colors hover:border-ink-muted hover:bg-surface-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none", className);
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className="mt-2 text-3xl font-medium text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-sm text-ink-muted">{sub}</p> : null}
      {trend ? (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            trend.direction === "up" && "text-success",
            trend.direction === "down" && "text-danger",
            trend.direction === "flat" && "text-ink-subtle",
          )}
        >
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
        </p>
      ) : null}
    </>
  );
  return href ? (
    <Link href={href} className={card} aria-label={`${label}: ${value}. Open the list.`}>
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  );
}
