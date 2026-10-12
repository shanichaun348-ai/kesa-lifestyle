import type { Metadata } from "next";
import Link from "next/link";

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
            <h2 id="returns-how" className="type-h3 text-ink mb-3">How to request a return or exchange</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Within 7 days of delivery, open the order under{" "}
                <Link href="/account/orders/" className="text-brand underline-offset-4 hover:underline">My orders</Link> (or look it up on{" "}
                <Link href="/track-order/" className="text-brand underline-offset-4 hover:underline">Track order</Link> with your order number and the email or mobile you used) and tap{" "}
                <span className="text-ink">Request a return or exchange</span>. Choose the pieces, tell us why, and add photos if something arrived damaged.
              </li>
              <li>We review every request within 2 business days and email you pickup or return instructions.</li>
              <li>Pack the pieces unworn, with tags, in their original packaging.</li>
              <li>Refunds are processed within 5–7 business days of the parcel reaching us; exchanges are dispatched as soon as the pieces are checked.</li>
            </ol>
            <p className="mt-2">
              Prefer to write? Email <span className="text-ink">hello@kesalifestyle.com</span> with your order number and we will raise the request for you.
            </p>
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
