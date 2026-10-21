/**
 * Draw order for the rotating "New arrivals" tiles.
 *
 * The row works through the whole pool once, in a shuffled order, before any
 * product comes round again. A deck holds what is still due this round; a
 * draw takes the first product that is not already on screen and leaves the
 * ones that are for later in the round. When the deck runs out it is
 * reshuffled from the pool, minus the pieces that never move (the owner's
 * pinned tiles).
 */

export type Deck = string[];

/** Fisher–Yates shuffle. `random` is injectable so tests are deterministic. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** A fresh round: every pool slug except the fixed ones, in random order. */
export function newRound(pool: readonly string[], fixed: ReadonlySet<string>, random: () => number = Math.random): Deck {
  return shuffle(
    pool.filter((slug) => !fixed.has(slug)),
    random,
  );
}

/**
 * Take the next product from the deck. Products currently on screen are
 * skipped but kept in the deck so they still get their turn this round.
 * Returns the slug and the deck that remains, or `null` when nothing in the
 * deck (or in a fresh round) is off screen.
 */
export function draw(
  deck: Deck,
  onScreen: ReadonlySet<string>,
  pool: readonly string[],
  fixed: ReadonlySet<string>,
  random: () => number = Math.random,
): { slug: string; deck: Deck } | null {
  const candidates = deck.length > 0 ? deck : newRound(pool, fixed, random);
  const index = candidates.findIndex((slug) => !onScreen.has(slug));
  if (index === -1) {
    // Everything left in this round is already showing; start the next round if it has anything new.
    if (deck.length === 0) return null;
    return draw([], onScreen, pool, fixed, random);
  }
  const slug = candidates[index] as string;
  return { slug, deck: [...candidates.slice(0, index), ...candidates.slice(index + 1)] };
}
