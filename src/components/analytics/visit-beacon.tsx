"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Sends one tiny POST per storefront page view to /api/visit/, which keeps
 * the daily visitor and page-view counts shown on the admin dashboard.
 * Fire-and-forget: it never blocks rendering and failures are ignored.
 */
export function VisitBeacon() {
  const pathname = usePathname();
  const last = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    const send = () => {
      fetch("/api/visit/", { method: "POST", keepalive: true, credentials: "same-origin", cache: "no-store" }).catch(() => undefined);
    };
    // Let the page paint first; the count can wait a moment.
    const id = window.setTimeout(send, 800);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
