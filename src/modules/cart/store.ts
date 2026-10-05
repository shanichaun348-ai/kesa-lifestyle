/**
 * Bag (cart) architecture.
 *
 * `CartStore` is the contract the UI uses. The current implementation keeps
 * the bag in localStorage so Add to bag / Buy now work end to end before
 * the server cart exists. Phase 2 replaces it with the server store
 * (cookie token → `carts`/`cart_items`, docs/05 §5) behind the same
 * interface; prices are then re-read from the catalogue on every render.
 *
 * Pure reducers are exported separately so they can be unit-tested.
 */

export type CartLine = {
  /** Variant SKU; unique per line. */
  sku: string;
  productSlug: string;
  name: string;
  optionLabel?: string | undefined;
  unitPricePaise: number;
  quantity: number;
  image: { src: string; alt: string; unoptimized?: boolean | undefined };
};

export type CartSnapshot = readonly CartLine[];

export interface CartStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): CartSnapshot;
  add(line: Omit<CartLine, "quantity">, quantity: number, maxQuantity: number): void;
  setQuantity(sku: string, quantity: number, maxQuantity: number): void;
  remove(sku: string): void;
  clear(): void;
}

/* ------------------------------------------------------------ reducers */

export function addLine(lines: CartSnapshot, line: Omit<CartLine, "quantity">, quantity: number, maxQuantity: number): CartSnapshot {
  const qty = Math.max(1, Math.floor(quantity));
  const existing = lines.find((l) => l.sku === line.sku);
  if (!existing) return [...lines, { ...line, quantity: Math.min(qty, maxQuantity) }];
  return lines.map((l) => (l.sku === line.sku ? { ...l, quantity: Math.min(l.quantity + qty, maxQuantity) } : l));
}

export function setLineQuantity(lines: CartSnapshot, sku: string, quantity: number, maxQuantity: number): CartSnapshot {
  const qty = Math.min(Math.max(0, Math.floor(quantity)), maxQuantity);
  if (qty === 0) return lines.filter((l) => l.sku !== sku);
  return lines.map((l) => (l.sku === sku ? { ...l, quantity: qty } : l));
}

export function removeLine(lines: CartSnapshot, sku: string): CartSnapshot {
  return lines.filter((l) => l.sku !== sku);
}

export function cartTotals(lines: CartSnapshot): { count: number; subtotalPaise: number } {
  return lines.reduce(
    (acc, l) => ({ count: acc.count + l.quantity, subtotalPaise: acc.subtotalPaise + l.quantity * l.unitPricePaise }),
    { count: 0, subtotalPaise: 0 },
  );
}

/* ---------------------------------------------------------- local store */

const STORAGE_KEY = "kesa:cart:v1";
const EMPTY: CartSnapshot = Object.freeze([]);
const listeners = new Set<() => void>();
let cache: CartSnapshot | null = null;

function isLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.sku === "string" && typeof v.productSlug === "string" && typeof v.name === "string" && typeof v.unitPricePaise === "number" && typeof v.quantity === "number";
}

function read(): CartSnapshot {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? Object.freeze(parsed.filter(isLine)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: CartSnapshot) {
  cache = Object.freeze([...next]);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable: bag lives for the session only */
  }
  listeners.forEach((l) => l());
}

export const localCartStore: CartStore = {
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
  add(line, quantity, maxQuantity) {
    commit(addLine(localCartStore.getSnapshot(), line, quantity, maxQuantity));
  },
  setQuantity(sku, quantity, maxQuantity) {
    commit(setLineQuantity(localCartStore.getSnapshot(), sku, quantity, maxQuantity));
  },
  remove(sku) {
    commit(removeLine(localCartStore.getSnapshot(), sku));
  },
  clear() {
    commit(EMPTY);
  },
};

export function getServerCartSnapshot(): CartSnapshot {
  return EMPTY;
}
