"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackPageView } from "@/modules/analytics/events";

/**
 * Fires a `page_view` event on every client-side navigation (including the
 * initial page load). Rendered in the storefront layout via Suspense.
 *
 * GA4 is configured with `send_page_view: false`, so this component is the
 * sole source of page_view events — preventing double-counting.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView({ url: pathname });
  }, [pathname]);

  return null;
}
