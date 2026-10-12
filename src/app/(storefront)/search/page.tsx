import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";

import { Container } from "@/components/storefront/container";
import { EmptyState } from "@/components/storefront/empty-state";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductGrid } from "@/components/storefront/product-grid";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { toCardData } from "@/modules/catalog/presenters";
import { shopperTags } from "@/modules/content/home-placements";
import { SEED_NOW } from "@/lib/demo/seed-catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  return {
    title: q ? `"${q}" — Search` : "Search",
    robots: { index: false },
  };
}

function normalise(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const needle = normalise(q);

  const products = needle
    ? (await getCatalogRepository().getAllActiveProducts()).filter((p) => {
        const haystack = normalise(
          [p.name, p.shortDescription, ...shopperTags(p.tags), ...p.categoryPaths, ...p.highlights].join(" "),
        );
        return haystack.includes(needle);
      })
    : [];

  const cards = products.map((p) => toCardData(p, { now: SEED_NOW, quickView: true }));

  return (
    <Container className="py-10 space-y-8">
      {/* Search bar */}
      <form action="/search/" method="GET" className="flex gap-2 max-w-xl">
        <label htmlFor="q" className="sr-only">Search products</label>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-muted" aria-hidden="true" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search jewellery…"
            autoComplete="off"
            className="h-11 w-full rounded-sm border border-line-strong bg-surface pl-9 pr-4 text-base text-ink placeholder:text-ink-subtle outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-sm font-medium text-bg hover:bg-ink-muted"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {!needle ? (
        <p className="text-sm text-ink-subtle">Enter a keyword above to search.</p>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<SearchIcon strokeWidth={1.5} />}
          title={`No results for "${q}"`}
          description="Try a different keyword or browse our collections."
        />
      ) : (
        <>
          <p className="text-sm text-ink-subtle">
            {cards.length} {cards.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
          </p>
          <ProductGrid>
            {cards.map((card, i) => (
              <li key={card.slug}>
                <ProductCard product={card} priority={i < 4} />
              </li>
            ))}
          </ProductGrid>
        </>
      )}
    </Container>
  );
}
