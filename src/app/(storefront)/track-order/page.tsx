import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";

import { TrackOrderForm } from "./_track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your Kesa Lifestyle order with your order number and the email or mobile number you ordered with.",
  robots: { index: false },
};

export default function TrackOrderPage() {
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Track order" }]} />
      <div className="mx-auto mt-8 max-w-lg">
        <header className="mb-6 text-center">
          <h1 className="type-h1">Track your order</h1>
          <p className="type-body mt-2 text-ink-muted">Enter your order number and the email or mobile number you used at checkout.</p>
        </header>
        <TrackOrderForm />
        <p className="type-small mt-6 text-center text-ink-subtle">
          Can&rsquo;t find it? Write to <a href="mailto:hello@kesalifestyle.com" className="text-brand underline-offset-4 hover:underline">hello@kesalifestyle.com</a> with your order number.
        </p>
      </div>
    </Container>
  );
}
