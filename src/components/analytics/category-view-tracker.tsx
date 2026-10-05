"use client";

import { useEffect } from "react";

import { trackCategoryView } from "@/modules/analytics/events";

type Props = {
  listName: string;
  items: Array<{ id: string; name: string }>;
};

/**
 * Fires a `view_item_list` (category_view) event once on mount.
 * Rendered inside ListingPage (RSC) with the page's product list.
 */
export function CategoryViewTracker({ listName, items }: Props) {
  useEffect(() => {
    trackCategoryView({ listName, items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
