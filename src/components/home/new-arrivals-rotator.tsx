"use client";

import * as React from "react";

import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";

/** How often one tile is swapped for another product. */
const SWAP_EVERY_MS = 2000;

type Props = {
  /** The tiles shown first (also what the server renders and what shows without JavaScript). */
  initial: ProductCardData[];
  /** Every product the row may pick from, including the ones already shown. */
  pool: ProductCardData[];
  label: string;
  priorityCount?: number;
};

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Moving tiles are skipped for people who asked for less motion. Server-rendered as off. */
function useMotionAllowed(): boolean {
  return React.useSyncExternalStore(
    subscribeMotion,
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * The "New arrivals" row. Every two seconds one tile, going left to right
 * and round again, is swapped for a random product from the pool that is
 * not on screen, with a short fade. Holds still while the pointer or
 * keyboard focus is on the row, while the tab is hidden, and for people who
 * prefer reduced motion. With no more products than tiles nothing moves.
 */
export function NewArrivalsRotator({ initial, pool, label, priorityCount = 0 }: Props) {
  const [shown, setShown] = React.useState(initial);
  const [held, setHeld] = React.useState(false);
  const motion = useMotionAllowed();
  const slot = React.useRef(0);

  const canRotate = motion && !held && pool.length > initial.length;

  React.useEffect(() => {
    if (!canRotate) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setShown((current) => {
        const onScreen = new Set(current.map((p) => p.slug));
        const candidates = pool.filter((p) => !onScreen.has(p.slug));
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (!pick) return current;
        const at = slot.current % current.length;
        slot.current += 1;
        return current.map((p, i) => (i === at ? pick : p));
      });
    }, SWAP_EVERY_MS);
    return () => window.clearInterval(id);
  }, [canRotate, pool]);

  return (
    <ul
      aria-label={label}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-5"
    >
      {shown.map((product, i) => (
        <li key={product.slug} className="tile-in w-[70vw] shrink-0 snap-start sm:w-[42vw] md:w-auto">
          <ProductCard product={product} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
