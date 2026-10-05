import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { WishlistGrid } from "@/components/storefront/wishlist-grid";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <Container className="pt-5 pb-16 lg:pb-24">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
      <header className="mt-5 lg:mt-8">
        <h1 className="type-h1">Wishlist</h1>
        <p className="type-body mt-2 text-ink-muted">Saved on this device. Sign in later to keep it across devices.</p>
      </header>
      <WishlistGrid />
    </Container>
  );
}
