"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type RevealGroupProps = {
  className?: string;
  /** Portion of the group that must be visible before the entrance plays (0–1). */
  threshold?: number;
  children: React.ReactNode;
};

/**
 * Plays a staggered entrance on descendants marked `.roll-in-item` (each with
 * `--i` set to its index) the first time the group scrolls into view. Until
 * the component mounts the items are simply visible, so nothing is hidden if
 * JavaScript never runs.
 */
export function RevealGroup({ className, threshold = 0.25, children }: RevealGroupProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Attributes are toggled on the DOM node directly: no re-render is needed, the CSS reacts.
    el.dataset.ready = "true";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.in = "true";
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={cn("roll-in-group", className)}>
      {children}
    </div>
  );
}
