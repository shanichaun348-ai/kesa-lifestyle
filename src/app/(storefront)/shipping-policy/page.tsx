import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { shippingDetailsJsonLd } from "@/modules/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Shipping Policy | Kesa Lifestyle" },
  description: "Standard shipping across India. Free shipping on orders over ₹999. Delivery in 5–7 business days.",
  alternates: { canonical: "/shipping-policy/" },
  robots: { index: true, follow: true },
};

export default function ShippingPolicyPage() {
  return (
    <Container className="py-8 lg:py-12">
      <JsonLd data={shippingDetailsJsonLd()} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shipping Policy" }]} />

      <article className="mt-6 max-w-2xl" id="shipping-india" aria-labelledby="shipping-title">
        <h1 id="shipping-title" className="type-h1">Shipping Policy</h1>
        <p className="mt-3 type-small text-ink-subtle">Effective date: 1 October 2026</p>

        <div className="mt-8 space-y-8 type-body text-ink-muted">
          <section aria-labelledby="shipping-where">
            <h2 id="shipping-where" className="type-h3 text-ink mb-3">Where we ship</h2>
            <p>
              We ship to all serviceable pin codes across India. International shipping is not
              available at this time.
            </p>
          </section>

          <section aria-labelledby="shipping-charges">
            <h2 id="shipping-charges" className="type-h3 text-ink mb-3">Shipping charges</h2>
            <p>
              Orders over ₹999 ship free. Orders below ₹999 attract a flat shipping fee of ₹59.
              The fee is calculated and shown at checkout before payment.
            </p>
          </section>

          <section aria-labelledby="shipping-time">
            <h2 id="shipping-time" className="type-h3 text-ink mb-3">Delivery time</h2>
            <p>
              Orders are processed within 1–2 business days of payment confirmation. Standard delivery
              takes 3–5 business days after dispatch, depending on your location. Metro cities are
              typically at the shorter end of this range.
            </p>
            <p className="mt-2">
              You will receive a tracking link by SMS and email once your order is dispatched.
            </p>
          </section>

          <section aria-labelledby="shipping-cod">
            <h2 id="shipping-cod" className="type-h3 text-ink mb-3">Cash on delivery (COD)</h2>
            <p>
              COD is available on orders up to ₹5,000. Please keep the exact amount ready at
              delivery. COD orders are not eligible for cancellation after dispatch.
            </p>
          </section>

          <section aria-labelledby="shipping-damage">
            <h2 id="shipping-damage" className="type-h3 text-ink mb-3">Damaged in transit</h2>
            <p>
              If your order arrives damaged, photograph the packaging and the item before opening
              further and email us at <span className="text-ink">hello@kesalifestyle.com</span> within
              48 hours of delivery. We will arrange a free replacement.
            </p>
          </section>
        </div>
      </article>
    </Container>
  );
}
