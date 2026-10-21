import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/storefront/container";

/**
 * Instant placeholder for the product page. The page itself is rendered on
 * demand (it reads the variant and reviews query strings and several
 * catalogue tables), so without this file a click on a product card waited
 * on the server with nothing on screen. This mirrors the geometry of
 * `_product-view.tsx`: breadcrumbs, gallery with a thumbnail rail, the
 * details column, and one product rail underneath.
 */
export default function ProductLoading() {
  return (
    <div className="overflow-x-clip">
      <Container className="relative isolate pt-5 pb-16 lg:pb-24 [--container-page:82.5rem]">
        <p role="status" className="sr-only">
          Loading product…
        </p>

        {/* Breadcrumbs */}
        <div aria-hidden="true" className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-2" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-2" />
          <Skeleton className="h-3.5 w-36" />
        </div>

        <div aria-hidden="true" className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
          {/* Gallery: thumbnail rail on desktop, main image in the product's 4:5 frame. */}
          <div className="flex flex-col lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-4">
            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="lux-hairline aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
            <div className="relative lg:mx-auto lg:w-full lg:max-w-[calc((100dvh-12.5rem)*0.8)]">
              <Skeleton className="lux-hairline aspect-[4/5] w-full rounded-2xl" />
            </div>
            <div className="mt-3 flex gap-2 lg:hidden">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="size-2 rounded-full" />
              ))}
            </div>
          </div>

          {/* Details column */}
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-11/12 lg:h-9" />
              <Skeleton className="h-8 w-7/12 lg:h-9" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-baseline gap-3">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Purchase panel: option chips, quantity, add to bag and buy now. */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-16 rounded-full" />
                <Skeleton className="h-9 w-16 rounded-full" />
                <Skeleton className="h-9 w-16 rounded-full" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Skeleton className="h-12 w-full rounded-full" />
                <Skeleton className="h-12 w-full rounded-full" />
              </div>
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Benefits */}
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* One rail of related pieces */}
        <section aria-hidden="true" className="mt-16 lg:mt-24">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-3 h-8 w-56" />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col">
                <Skeleton className="lux-hairline aspect-[3/4] w-full rounded-md" />
                <Skeleton className="mt-3 h-[1.125rem] w-4/5" />
                <Skeleton className="mt-2 h-4 w-2/5" />
              </div>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
