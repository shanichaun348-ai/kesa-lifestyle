/**
 * Wishlist architecture.
 *
 * The device store (localStorage, keyed by product slug) is the UI's source
 * of truth for instant feedback. When the customer is signed in, the store
 * is mirrored to the account wishlist (`wishlists`/`wishlist_items`):
 * `WishlistSync` merges on page load and `WishlistButton` writes through on
 * every toggle. Guests keep a device-only list that merges on first login.
 *
 * Framework-agnostic on purpose: no React imports here.
 */

export type WishlistSnapshot = readonly string[];

export interface WishlistStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): WishlistSnapshot;
  toggle(slug: string): void;
  has(slug: string): boolean;
  /** Replace the whole list (used when mirroring the account wishlist). */
  replace(slugs: readonly string[]): void;
}

const STORAGE_KEY = "kesa:wishlist:v1";
const EMPTY: WishlistSnapshot = Object.freeze([]);

function read(): WishlistSnapshot {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? Object.freeze(parsed.filter((s): s is string => typeof s === "string")) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(slugs: WishlistSnapshot) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    /* storage unavailable: wishlist lives for the session only */
  }
}

const listeners = new Set<() => void>();
let cache: WishlistSnapshot | null = null;

function emit() {
  listeners.forEach((l) => l());
}

export const localWishlistStore: WishlistStore = {
  subscribe(listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot() {
    cache ??= read();
    return cache;
  },
  toggle(slug) {
    const current = localWishlistStore.getSnapshot();
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
    cache = Object.freeze(next);
    write(cache);
    emit();
  },
  has(slug) {
    return localWishlistStore.getSnapshot().includes(slug);
  },
  replace(slugs) {
    cache = Object.freeze([...slugs]);
    write(cache);
    emit();
  },
};

/** Server snapshot: nothing saved. Hydration-safe default. */
export function getServerWishlistSnapshot(): WishlistSnapshot {
  return EMPTY;
}
