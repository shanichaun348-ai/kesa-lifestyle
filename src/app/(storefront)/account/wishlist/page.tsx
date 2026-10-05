import type { Metadata } from "next";
import Link from "next/link";
import { HeartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { EmptyState } from "@/components/storefront/empty-state";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductGrid } from "@/components/storefront/product-grid";
import { requireUser } from "@/lib/auth/guard";
import { getAccountService } from "@/modules/account/server";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false, follow: false } };

export default async function AccountWishlistPage() {
  const user = await requireUser("/account/wishlist/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const cards = await service.wishlist.cards(user.id);
  return (
    <>
      <AccountHeading title="Wishlist" intro="Saved across your devices." />
      {cards.length === 0 ? (
        <EmptyState
          icon={<HeartIcon strokeWidth={1.5} />}
          title="Nothing saved yet"
          description="Tap the heart on any piece to keep it here."
          action={
            <Button asChild>
              <Link href="/collections/new-arrivals/">See new arrivals</Link>
            </Button>
          }
        />
      ) : (
        <ProductGrid className="xl:grid-cols-3">
          {cards.map((card) => (
            <li key={card.slug}>
              <ProductCard product={card} />
            </li>
          ))}
        </ProductGrid>
      )}
    </>
  );
}
