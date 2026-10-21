import { describe, expect, it } from "vitest";

import { draw, newRound, shuffle, type Deck } from "@/components/home/rotation-deck";

/** Deterministic "random": just under 1 makes Fisher–Yates swap each item with itself, keeping the original order. */
const keepOrder = () => 1 - Number.EPSILON;

/** Runs the rotator the way the component does: five tiles, swap one at a time, round robin over the movable slots. */
function simulate(pool: string[], initial: string[], fixedCount: number, ticks: number, random: () => number = Math.random): string[] {
  const fixed = new Set(initial.slice(0, fixedCount));
  let shown = [...initial];
  let deck: Deck = newRound(
    pool.filter((slug) => !initial.includes(slug)),
    fixed,
    random,
  );
  const movable = initial.length - fixedCount;
  const sequence: string[] = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const next = draw(deck, new Set(shown), pool, fixed, random);
    if (!next) break;
    deck = next.deck;
    const at = fixedCount + (tick % movable);
    shown = shown.map((slug, i) => (i === at ? next.slug : slug));
    sequence.push(next.slug);
  }
  return sequence;
}

describe("shuffle", () => {
  it("keeps every item exactly once", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect([...shuffle(items)].sort()).toEqual(items);
    expect(shuffle(items, keepOrder)).toEqual(items);
  });
});

describe("draw", () => {
  const pool = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "p12"];
  const initial = ["p1", "p2", "p3", "p4", "p5"];

  it("shows every product not on screen before any product repeats", () => {
    const seq = simulate(pool, initial, 0, 7);
    // 7 products are off screen at the start; all 7 appear first, none twice.
    expect(seq).toHaveLength(7);
    expect(new Set(seq).size).toBe(7);
    expect(seq.every((s) => !initial.includes(s))).toBe(true);
  });

  it("then works through the whole pool again without repeating inside a round", () => {
    const seq = simulate(pool, initial, 0, 7 + 12);
    const secondRound = seq.slice(7);
    expect(secondRound).toHaveLength(12);
    expect(new Set(secondRound).size).toBe(12);
    expect([...secondRound].sort()).toEqual([...pool].sort());
  });

  it("never picks something that is already on screen", () => {
    const fixedCount = 2;
    const fixed = new Set(initial.slice(0, fixedCount));
    let shown = [...initial];
    let deck: Deck = [];
    for (let tick = 0; tick < 60; tick += 1) {
      const next = draw(deck, new Set(shown), pool, fixed);
      expect(next).not.toBeNull();
      if (!next) return;
      expect(shown).not.toContain(next.slug);
      expect(fixed.has(next.slug)).toBe(false);
      deck = next.deck;
      const at = fixedCount + (tick % (initial.length - fixedCount));
      shown = shown.map((slug, i) => (i === at ? next.slug : slug));
    }
  });

  it("never swaps in a pinned (fixed) piece", () => {
    const seq = simulate(pool, initial, 2, 40);
    expect(seq).not.toContain("p1");
    expect(seq).not.toContain("p2");
  });

  it("returns null when nothing off screen is left to show", () => {
    const small = ["a", "b", "c"];
    expect(draw([], new Set(small), small, new Set())).toBeNull();
  });

  it("with the identity shuffle, draws in pool order and skips on-screen pieces", () => {
    const seq = simulate(["a", "b", "c", "d", "e", "f"], ["a", "b"], 0, 4, keepOrder);
    expect(seq).toEqual(["c", "d", "e", "f"]);
  });
});
