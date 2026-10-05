import { cn } from "@/lib/utils";

type RatingStarsProps = {
  /** 0–5, half steps allowed. */
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
};

function Star({ fill, size }: { fill: number; size: number }) {
  const id = `star-${Math.round(fill * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset={`${fill * 100}%`} stopColor="currentColor" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L10 14.9l-5.3 2.8 1.1-5.9L1.5 7.7l5.9-.8L10 1.5z"
        fill={`url(#${id})`}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Five-star rating in the brass highlight. Announces "4.5 out of 5 stars". */
export function RatingStars({ rating, count, size = "sm", className }: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const px = size === "sm" ? 14 : 18;
  const label = `${clamped.toFixed(1)} out of 5 stars${count !== undefined ? `, ${count} reviews` : ""}`;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-highlight", className)} role="img" aria-label={label}>
      <span className="inline-flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={px} fill={Math.max(0, Math.min(1, clamped - i))} />
        ))}
      </span>
      {count !== undefined ? (
        <span className="type-small text-ink-muted" aria-hidden="true">
          ({count})
        </span>
      ) : null}
    </span>
  );
}
