"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "loading" | "done";

/** Give up and hide the bar if a navigation never completes (e.g. an aborted request). */
const STALL_MS = 20_000;
/** How long the finished bar stays at full width before it fades out. */
const DONE_MS = 180;
/** Fade-out duration; matches the CSS transition. */
const FADE_MS = 320;

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
}

/** True when a click on `anchor` will navigate this tab to another page of this site. */
function navigatesWithinSite(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  // Same page (only the hash differs, or an identical URL): the browser will not fetch anything.
  return url.pathname + url.search !== window.location.pathname + window.location.search;
}

/**
 * Thin gold bar across the top of the viewport while a page is loading.
 *
 * Starts on any in-site link click or back/forward, and ends when the URL
 * the app renders changes. Route-level `loading.tsx` files still give each
 * page its own skeleton; this covers the gap for pages without one and the
 * first few hundred milliseconds before a skeleton is on screen.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const timers = React.useRef<number[]>([]);

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  // Begin on clicks and history navigation.
  React.useEffect(() => {
    const start = () => {
      clearTimers();
      setPhase("loading");
      timers.current.push(window.setTimeout(() => setPhase("idle"), STALL_MS));
    };
    const onClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (anchor instanceof HTMLAnchorElement && navigatesWithinSite(anchor)) start();
    };
    const onPopState = () => start();
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, []);

  // Finish once the rendered URL changes.
  const location = `${pathname}?${searchParams.toString()}`;
  const lastLocation = React.useRef(location);
  React.useEffect(() => {
    if (lastLocation.current === location) return;
    lastLocation.current = location;
    clearTimers();
    setPhase((current) => (current === "loading" ? "done" : current));
    timers.current.push(window.setTimeout(() => setPhase("idle"), DONE_MS + FADE_MS));
  }, [location]);

  return (
    <div
      aria-hidden="true"
      data-phase={phase}
      className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <span className="nav-progress-bar block h-full" />
    </div>
  );
}
