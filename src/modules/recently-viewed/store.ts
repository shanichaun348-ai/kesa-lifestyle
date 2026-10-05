"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Recently viewed products: slugs only, most recent first, capped at 12,
 * kept in localStorage. Cards are resolved through `/api/catalog/cards/`.
 */

const STORAGE_KEY = "kesa:recently-viewed:v1";
const LIMIT = 12;
const EMPTY: readonly string[] = Object.freeze([]);
const listeners = new Set<() => void>();
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? Object.freeze(parsed.filter((s): s is string => typeof s === "string").slice(0, LIMIT)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): readonly string[] {
  cache ??= read();
  return cache;
}

export function recordView(slug: string) {
  const next = [slug, ...getSnapshot().filter((s) => s !== slug)].slice(0, LIMIT);
  cache = Object.freeze(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useRecentlyViewed() {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const record = useCallback((slug: string) => recordView(slug), []);
  return { slugs, record };
}
