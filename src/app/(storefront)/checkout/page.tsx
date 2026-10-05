import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/storefront/container";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/**
 * Honest placeholder: checkout, payments and order creation are Phase 2
 * (docs/13 §4). Buy now and the bag's Checkout button land here so the
 * flow can be exercised without pretending an order was placed.
 */
export default function CheckoutPage() {
  return (
    <Container className="pt-10 pb-24">
      <div className="mx-auto max-w-xl">
        <p className="type-eyebrow text-ink-subtle">Checkout</p>
        <h1 className="type-h1 mt-2">Almost there</h1>
        <Alert variant="info" className="mt-6">
          <AlertTitle>Checkout is not live yet</AlertTitle>
          <AlertDescription>
            Payments (UPI, cards, net banking, cash on delivery), address entry and order confirmation are being built in the next phase. Your bag is saved on this device in the meantime.
          </AlertDescription>
        </Alert>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" asChild>
            <Link href="/cart/">Back to bag</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/collections/new-arrivals/">Keep browsing</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
