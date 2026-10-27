import type { Metadata } from "next";

import { Container } from "@/components/storefront/container";
import { suggestedCouponCode } from "@/modules/content/announcement-server";
import { CheckoutForm } from "./_components/CheckoutForm";

// Checkout must be server-rendered on every request so env vars (Razorpay key)
// are read at runtime, not baked in at build time. Without a gateway the page
// still works: cash on delivery is offered on its own.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const onlineEnabled = Boolean(process.env.RAZORPAY_KEY_ID);
  const suggestedCode = await suggestedCouponCode();

  return (
    <Container className="pt-8 pb-24">
      <p className="type-eyebrow text-ink-subtle">Checkout</p>
      <h1 className="type-h1 mt-2 mb-8">Complete your order</h1>
      <CheckoutForm suggestedCode={suggestedCode} onlineEnabled={onlineEnabled} />
    </Container>
  );
}
