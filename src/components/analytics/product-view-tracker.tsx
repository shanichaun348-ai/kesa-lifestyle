"use client";

import { useEffect } from "react";

import { trackProductView } from "@/modules/analytics/events";

type Props = {
  sku: string;
  productName: string;
  pricePaise: number;
  categoryPath?: string | undefined;
};

/**
 * Fires a `view_item` (product_view) event once on mount.
 * Rendered as a child of the product page (RSC) with the resolved variant data.
 */
export function ProductViewTracker({ sku, productName, pricePaise, categoryPath }: Props) {
  useEffect(() => {
    trackProductView({ sku, productName, pricePaise, categoryPath });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
