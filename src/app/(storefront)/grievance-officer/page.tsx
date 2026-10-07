import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { legal, site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `Grievance Officer | ${site.name}` },
  description: `How to raise a complaint with ${site.name} and contact our Grievance Officer, as required under the Consumer Protection (E-Commerce) Rules, 2020.`,
  alternates: { canonical: "/grievance-officer/" },
  robots: { index: true, follow: true },
};

export default function GrievanceOfficerPage() {
  const officer = legal.grievanceOfficer;
  const telHref = `tel:${officer.phone.replace(/[^+\d]/g, "")}`;

  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Grievance Officer" }]} />

      <article className="mt-6 max-w-2xl" aria-labelledby="grievance-title">
        <h1 id="grievance-title" className="type-h1">Grievance Redressal</h1>
        <p className="mt-3 type-small text-ink-subtle">
          Published in compliance with the Consumer Protection (E-Commerce) Rules, 2020 and the Consumer Protection Act, 2019.
        </p>

        <div className="mt-8 space-y-8 type-body text-ink-muted">
          <section aria-labelledby="grievance-officer">
            <h2 id="grievance-officer" className="type-h3 text-ink mb-3">Grievance Officer</h2>
            <p>
              If you have a complaint about an order, a product, a refund or anything else relating to
              your experience with {site.name}, you can contact our Grievance Officer directly.
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-md border border-line bg-surface p-5 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-ink-subtle">Name</dt>
              <dd className="text-ink">{officer.name}</dd>
              <dt className="text-ink-subtle">Designation</dt>
              <dd className="text-ink">{officer.designation}</dd>
              <dt className="text-ink-subtle">Email</dt>
              <dd><a href={`mailto:${officer.email}`} className="text-brand underline-offset-4 hover:underline">{officer.email}</a></dd>
              <dt className="text-ink-subtle">Phone</dt>
              <dd><a href={telHref} className="text-brand underline-offset-4 hover:underline">{officer.phone}</a></dd>
              <dt className="text-ink-subtle">Hours</dt>
              <dd className="text-ink">{legal.supportHours}</dd>
              <dt className="text-ink-subtle">Postal address</dt>
              <dd className="text-ink">{legal.entityName}<br />{legal.registeredAddress}</dd>
            </dl>
          </section>

          <section aria-labelledby="grievance-how">
            <h2 id="grievance-how" className="type-h3 text-ink mb-3">How to raise a complaint</h2>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Email <span className="text-ink">{officer.email}</span> with the subject line{" "}
                <span className="text-ink">&ldquo;Grievance&rdquo;</span>, or call the number above during support hours.
              </li>
              <li>Include your order number (for example KL-1024), your registered email or phone, and a clear description of the issue.</li>
              <li>Attach photos if the complaint concerns a damaged, defective or incorrect item.</li>
            </ol>
          </section>

          <section aria-labelledby="grievance-timeline">
            <h2 id="grievance-timeline" className="type-h3 text-ink mb-3">What happens next</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>We will acknowledge your complaint, with a reference number, within <span className="text-ink">48 hours</span> of receiving it.</li>
              <li>We aim to resolve every grievance within <span className="text-ink">one month</span> of receipt, as required by law. Most order and refund issues are resolved far sooner.</li>
              <li>You will be kept informed by email at each stage, and told the outcome and the reasons for it.</li>
            </ul>
          </section>

          <section aria-labelledby="grievance-escalation">
            <h2 id="grievance-escalation" className="type-h3 text-ink mb-3">If you are not satisfied</h2>
            <p>
              If your grievance is not resolved to your satisfaction, you may approach the National
              Consumer Helpline on <span className="text-ink">1915</span> (toll-free) or at{" "}
              <a href="https://consumerhelpline.gov.in" target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-4 hover:underline">consumerhelpline.gov.in</a>,
              or file a complaint with the appropriate Consumer Disputes Redressal Commission.
            </p>
          </section>

          <section aria-labelledby="grievance-related">
            <h2 id="grievance-related" className="type-h3 text-ink mb-3">Related policies</h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <li><Link href="/returns-policy/" className="text-brand underline-offset-4 hover:underline">Returns Policy</Link></li>
              <li><Link href="/shipping-policy/" className="text-brand underline-offset-4 hover:underline">Shipping Policy</Link></li>
              <li><Link href="/terms/" className="text-brand underline-offset-4 hover:underline">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy-policy/" className="text-brand underline-offset-4 hover:underline">Privacy Policy</Link></li>
            </ul>
          </section>
        </div>
      </article>
    </Container>
  );
}
