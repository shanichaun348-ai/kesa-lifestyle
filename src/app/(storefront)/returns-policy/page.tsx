import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { merchantReturnPolicyJsonLd } from "@/modules/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Returns Policy | Kesa Lifestyle" },
  description: "Learn about our 7-day return and exchange policy for Kesa Lifestyle jewellery.",
  alternates: { canonical: "/returns-policy/" },
  robots: { index: true, follow: true },
};

export default function ReturnsPolicyPage() {
  return (
    <Container className="py-8 lg:py-12">
      <JsonLd data={merchantReturnPolicyJsonLd()} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Returns Policy" }]} />

      <article className="mt-6 max-w-2xl" id="return-policy" aria-labelledby="returns-title">
        <h1 id="returns-title" className="type-h1">Returns Policy</h1>
        <p className="mt-3 type-small text-ink-subtle">Effective date: 1 October 2026</p>

        <div className="mt-8 space-y-8 type-body text-ink-muted">
          <section aria-labelledby="returns-window">
            <h2 id="returns-window" className="type-h3 text-ink mb-3">Return window</h2>
            <p>
              We accept returns within 7 days of delivery. To be eligible, the piece must be unworn,
              undamaged, with all original packaging and tags attached. Items showing signs of wear,
              alterations or damage are not eligible for return.
            </p>
          </section>

          <section aria-labelledby="returns-earrings">
            <h2 id="returns-earrings" className="type-h3 text-ink mb-3">Earrings and hygiene items</h2>
            <p>
              For hygiene reasons, earrings and nose pins are exchange-only. We will exchange them for
              a different size, style or equal-value piece if the item is unworn and in original
              packaging. We do not offer cash refunds on earrings.
            </p>
            <p className="mt-2">
              If the piece you received is defective or different from what was ordered, we will
              replace it free of charge regardless of category.
            </p>
          </section>

          <section aria-labelledby="returns-how">
            <h2 id="returns-how" className="type-h3 text-ink mb-3">How to return</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Email us at <span className="text-ink">hello@kesalifestyle.com</span> within 7 days of delivery with your order number and reason for return.</li>
              <li>We will send you a return shipping label within 1 business day.</li>
              <li>Pack the item securely in its original packaging and drop it off at the courier.</li>
              <li>Refunds are processed within 5–7 business days of receiving the return.</li>
            </ol>
          </section>

          <section aria-labelledby="returns-refund">
            <h2 id="returns-refund" className="type-h3 text-ink mb-3">Refund method</h2>
            <p>
              Refunds are issued to the original payment method. For COD orders, refunds are processed
              as bank transfers to the account you provide. UPI and card refunds typically appear
              within 5–7 business days depending on your bank.
            </p>
          </section>

          <section aria-labelledby="returns-final">
            <h2 id="returns-final" className="type-h3 text-ink mb-3">Final sale items</h2>
            <p>
              Items marked Final Sale at the time of purchase are not eligible for return or exchange,
              except in the case of damage or incorrect fulfilment.
            </p>
          </section>
        </div>
      </article>
    </Container>
  );
}
