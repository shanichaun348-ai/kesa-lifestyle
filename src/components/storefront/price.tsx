import { formatPaise, percentOff } from "@/lib/money";
import { cn } from "@/lib/utils";

type PriceProps = {
  pricePaise: number;
  compareAtPaise?: number | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
} as const;

/**
 * Price with optional compare-at strikethrough and savings.
 * Screen readers hear "Original price ₹1,999" rather than a bare struck number.
 */
export function Price({ pricePaise, compareAtPaise, size = "md", className }: PriceProps) {
  const off = compareAtPaise !== undefined ? percentOff(compareAtPaise, pricePaise) : null;

  return (
    <p className={cn("type-price flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-ink", sizes[size], className)}>
      <span>{formatPaise(pricePaise)}</span>
      {off !== null && compareAtPaise !== undefined ? (
        <>
          <s className="font-normal text-ink-subtle">
            <span className="sr-only">Original price </span>
            {formatPaise(compareAtPaise)}
          </s>
          <span className="text-xs font-medium text-success">{off}% off</span>
        </>
      ) : null}
    </p>
  );
}
