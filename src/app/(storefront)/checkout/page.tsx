import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Container } from "@/components/storefront/container";
import { CheckoutForm } from "./_components/CheckoutForm";

// Checkout must be server-rendered on every request so env vars (Razorpay key)
// are read at runtime, not baked in at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID);

  if (!razorpayConfigured) {
    return (
      <Container className="pt-10 pb-24">
        <div className="mx-auto max-w-xl">
          <p className="type-eyebrow text-ink-subtle">Checkout</p>
          <h1 className="type-h1 mt-2">Checkout unavailable</h1>
          <Alert variant="info" className="mt-6">
            <AlertTitle>Payment gateway not configured</AlertTitle>
            <AlertDescription>
              Online payments are not yet enabled for this store. Please check back soon or contact us directly.
            </AlertDescription>
          </Alert>
        </div>
      </Container>
    );
  }

  return (
    <Container className="pt-8 pb-24">
      <p className="type-eyebrow text-ink-subtle">Checkout</p>
      <h1 className="type-h1 mt-2 mb-8">Complete your order</h1>
      <CheckoutForm />
    </Container>
  );
}
