import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { cn } from "@/lib/utils";

type ProductRailProps = {
  products: ProductCardData[];
  /** Accessible name for the list, e.g. "New arrivals". */
  label: string;
  /** Eager-load the first N images (above-the-fold rails only). */
  priorityCount?: number;
  className?: string;
};

/**
 * Horizontal scroll-snap rail on phones, 4-column grid from `md` (callers can widen it with `className`).
 * Pure CSS: no carousel JavaScript, no arrows. The scroll container is a
 * list, so screen readers announce item count and position.
 */
export function ProductRail({ products, label, priorityCount = 0, className }: ProductRailProps) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1",
        "md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0",
        className,
      )}
    >
      {products.map((product, i) => (
        <li key={product.slug} className="w-[70vw] shrink-0 snap-start sm:w-[42vw] md:w-auto">
          <ProductCard product={product} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
