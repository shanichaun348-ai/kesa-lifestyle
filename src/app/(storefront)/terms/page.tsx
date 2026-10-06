import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for shopping at Kesa Lifestyle.",
};

export default function TermsPage() {
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]} />
      <div className="mx-auto mt-8 max-w-2xl space-y-8">
        <h1 className="type-h1">Terms &amp; Conditions</h1>
        <p className="text-ink-subtle text-sm">Last updated: October 2025</p>

        <section className="space-y-3">
          <h2 className="type-h3">1. About us</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Kesa Lifestyle (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this website. By placing an order you agree to these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">2. Products</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Product images are for illustration; slight colour variations may appear on screen. We reserve the right to discontinue products at any time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">3. Pricing</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            All prices are in Indian Rupees (INR) and include applicable GST. Shipping charges are shown at checkout. We reserve the right to correct pricing errors before order fulfilment.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">4. Orders and payment</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            An order confirmation email constitutes acceptance of your order. Payment is charged at the time of ordering via Razorpay. We reserve the right to cancel any order due to stock unavailability or suspected fraud, with a full refund.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">5. Shipping</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            We ship within India. Estimated delivery timelines are shown at checkout and are not guaranteed. Please see our <a href="/shipping-policy/" className="text-brand hover:underline">Shipping Policy</a> for full details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">6. Returns and refunds</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Returns and exchanges are subject to our <a href="/returns-policy/" className="text-brand hover:underline">Returns Policy</a>. Refunds are processed to the original payment method within 5–7 business days of receiving the return.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">7. Intellectual property</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            All content on this site (images, text, logos) is owned by Kesa Lifestyle and may not be reproduced without written permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">8. Limitation of liability</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            To the extent permitted by law, our liability is limited to the value of the goods purchased. We are not liable for indirect or consequential losses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">9. Governing law</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            These terms are governed by Indian law. Any disputes shall be subject to the jurisdiction of courts in Gujarat, India.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">10. Contact</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Email: <a href="mailto:hello@kesalifestyle.com" className="text-brand hover:underline">hello@kesalifestyle.com</a>
          </p>
        </section>
      </div>
    </Container>
  );
}
