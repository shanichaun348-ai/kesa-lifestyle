import type { Metadata } from "next";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { CartPageContent } from "@/components/storefront/cart-page-content";
import { CartResume } from "@/components/storefront/cart-resume";
import { Container } from "@/components/storefront/container";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <Container className="pt-5 pb-16 lg:pb-24">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Bag" }]} />
      <h1 className="type-h1 mt-5 lg:mt-8">Your bag</h1>
      {/* Suspense: useSearchParams needs a boundary so the rest of the page stays static. */}
      <Suspense fallback={null}>
        <CartResume />
      </Suspense>
      <CartPageContent />
    </Container>
  );
}
