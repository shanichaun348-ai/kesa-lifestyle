import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors ProductCard geometry so the grid does not shift when data arrives. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <Skeleton className="lux-hairline aspect-[3/4] w-full rounded-md" />
      <Skeleton className="mt-3 h-[1.125rem] w-4/5" />
      <Skeleton className="mt-2 h-4 w-2/5" />
    </div>
  );
}
