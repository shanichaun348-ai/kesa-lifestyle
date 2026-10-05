"use client";

import * as React from "react";
import Link from "next/link";
import { HeartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/storefront/empty-state";
import { InlineError } from "@/components/storefront/error-state";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { ProductCardSkeleton } from "@/components/storefront/product-card-skeleton";
import { ProductGrid } from "@/components/storefront/product-grid";
import { useWishlist } from "@/modules/wishlist/use-wishlist";

type State = { status: "idle" | "loading" | "ready" | "error"; items: ProductCardData[] };

/** Client grid over the local wishlist store; resolves slugs through the API. */
export function WishlistGrid() {
  const { slugs } = useWishlist();
  const key = slugs.join(",");
  const [state, setState] = React.useState<State>({ status: "idle", items: [] });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ slugs: key });
    // Trailing slash matches `trailingSlash: true` and avoids a redirect hop.
    fetch(`/api/catalog/cards/?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items: ProductCardData[] };
        setState({ status: "ready", items: data.items });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ status: "error", items: [] });
      });
    return () => controller.abort();
  }, [key, attempt]);

  if (slugs.length === 0) {
    return (
      <EmptyState
        className="mt-10"
        icon={<HeartIcon strokeWidth={1.5} />}
        title="Your wishlist is empty"
        description="Tap the heart on any piece to save it here."
        action={
          <Button asChild>
            <Link href="/collections/new-arrivals/">See new arrivals</Link>
          </Button>
        }
      />
    );
  }

  if (state.status === "error") {
    return (
      <InlineError
        className="mt-8"
        title="We couldn't load your saved pieces"
        description="Check your connection and try again."
        action={
          <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </Button>
        }
      />
    );
  }

  if (state.status !== "ready") {
    return (
      <ProductGrid className="mt-8" aria-busy="true">
        {slugs.map((s) => (
          <li key={s}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ProductGrid>
    );
  }

  return (
    <ProductGrid className="mt-8">
      {state.items.map((item) => (
        <li key={item.slug}>
          <ProductCard product={item} />
        </li>
      ))}
    </ProductGrid>
  );
}
