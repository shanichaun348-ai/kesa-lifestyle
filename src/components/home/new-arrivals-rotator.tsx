"use client";

import * as React from "react";

import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";

import { draw, newRound, type Deck } from "./rotation-deck";

/** How often one tile is swapped for another product. */
const SWAP_EVERY_MS = 10_000;

type Props = {
  /** The tiles shown first (also what the server renders and what shows without JavaScript). */
  initial: ProductCardData[];
  /** Every product the row may pick from, including the ones already shown. */
  pool: ProductCardData[];
  /** How many tiles at the start are the owner's chosen pieces; they stay put and only the others are swapped. */
  fixedCount: number;
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
 * The "New arrivals" row. Every ten seconds one tile, going left to right
 * and round again, is swapped for the next product in a shuffled run of the
 * whole pool, with a short fade: no product comes back until every other
 * product has had its turn on screen. The owner's chosen pieces (the first
 * `fixedCount` tiles) are never swapped. Holds still while the pointer or
 * keyboard focus is on the row, while the tab is hidden, and for people who
 * prefer reduced motion. With no more products than tiles nothing moves.
 */
export function NewArrivalsRotator({ initial, pool, fixedCount, label, priorityCount = 0 }: Props) {
  const [shown, setShown] = React.useState(initial);
  const [held, setHeld] = React.useState(false);
  const motion = useMotionAllowed();
  const slot = React.useRef(0);
  /** What is still due this round; the first round skips the tiles that are already showing. */
  const deck = React.useRef<Deck | null>(null);
  const shownRef = React.useRef(shown);
  React.useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  const movable = initial.length - fixedCount;
  const canRotate = motion && !held && movable > 0 && pool.length > initial.length;

  React.useEffect(() => {
    if (!canRotate) return;
    const bySlug = new Map(pool.map((p) => [p.slug, p]));
    const slugs = pool.map((p) => p.slug);
    const fixed = new Set(initial.slice(0, fixedCount).map((p) => p.slug));
    deck.current ??= newRound(
      slugs.filter((slug) => !initial.some((p) => p.slug === slug)),
      fixed,
    );
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const onScreen = new Set(shownRef.current.map((p) => p.slug));
      const next = draw(deck.current ?? [], onScreen, slugs, fixed);
      const pick = next ? bySlug.get(next.slug) : undefined;
      if (!next || !pick) return;
      deck.current = next.deck;
      const at = fixedCount + (slot.current % movable);
      slot.current += 1;
      setShown((current) => current.map((p, i) => (i === at ? pick : p)));
    }, SWAP_EVERY_MS);
    return () => window.clearInterval(id);
  }, [canRotate, pool, initial, fixedCount, movable]);

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
