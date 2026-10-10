"use client";

import { useEffect, useMemo, useState } from "react";

import { checkLines, type AvailabilityItem, type LineCheck } from "./availability";

type Result = {
  /** One entry per bag line the catalogue has answered for. */
  checks: ReadonlyMap<string, LineCheck>;
  /** True while some line is still waiting for its first answer. */
  checking: boolean;
  /** True when the last check could not run (network); the server still guards checkout. */
  failed: boolean;
};

type Answer = { skus: ReadonlySet<string>; items: AvailabilityItem[] };

/**
 * Asks the catalogue whether each bag line can still be bought. Re-fetches
 * when the set of SKUs changes; quantity changes are judged against the
 * stock already known, so the page never flickers back to "checking".
 */
export function useBagAvailability(lines: ReadonlyArray<{ sku: string; quantity: number }>): Result {
  const skuKey = useMemo(() => [...new Set(lines.map((l) => l.sku))].sort().join(","), [lines]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!skuKey) return;
    let cancelled = false;
    fetch(`/api/catalog/availability/?skus=${encodeURIComponent(skuKey)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`availability ${res.status}`);
        const data = (await res.json()) as { items?: AvailabilityItem[] };
        if (cancelled) return;
        setAnswer({ skus: new Set(skuKey.split(",")), items: data.items ?? [] });
        setFailedFor(null);
      })
      .catch(() => {
        if (!cancelled) setFailedFor(skuKey);
      });
    return () => {
      cancelled = true;
    };
  }, [skuKey]);

  const known = useMemo(() => (answer ? lines.filter((l) => answer.skus.has(l.sku)) : []), [answer, lines]);
  const checks = useMemo(() => (answer ? checkLines(known, answer.items) : new Map<string, LineCheck>()), [answer, known]);
  const failed = failedFor === skuKey;
  const checking = !failed && known.length < lines.length;
  return { checks, checking, failed };
}
