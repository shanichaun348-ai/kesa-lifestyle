"use client";

import * as React from "react";

import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { useRecentlyViewed } from "@/modules/recently-viewed/store";

type RecentlyViewedProps = {
  /** Current product; recorded on mount and excluded from the list. */
  currentSlug: string;
};

/**
 * Records the current product and renders the previous ones. Client-only by
 * nature (per-device history); renders nothing on the server and nothing
 * until there is something to show, so it never shifts layout.
 */
export function RecentlyViewed({ currentSlug }: RecentlyViewedProps) {
  const { slugs, record } = useRecentlyViewed();
  const others = React.useMemo(() => slugs.filter((s) => s !== currentSlug).slice(0, 8), [slugs, currentSlug]);
  const key = others.join(",");
  const [items, setItems] = React.useState<ProductCardData[]>([]);

  React.useEffect(() => {
    record(currentSlug);
  }, [currentSlug, record]);

  React.useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/catalog/cards/?slugs=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { items: ProductCardData[] };
        setItems(data.items);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [key]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-title" className="border-t border-line pt-10">
      <SectionHeading eyebrow="Recently viewed" title="Pick up where you left off" className="mb-6" />
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0" aria-label="Recently viewed products">
        {items.map((item) => (
          <li key={item.slug} className="w-[60vw] shrink-0 snap-start sm:w-[38vw] md:w-auto">
            <ProductCard product={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
