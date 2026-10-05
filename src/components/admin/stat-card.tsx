import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  className?: string;
};

export function StatCard({ label, value, sub, trend, className }: Props) {
  return (
    <div className={cn("rounded-md border border-line bg-surface p-5", className)}>
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
    </div>
  );
}
