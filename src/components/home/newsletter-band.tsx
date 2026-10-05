import { NewsletterForm } from "@/components/storefront/newsletter-form";

/** Newsletter capture as a quiet band above the footer. */
export function NewsletterBand() {
  return (
    <section aria-labelledby="newsletter-title" className="border-y border-line">
      <div className="container-page grid gap-6 py-12 lg:grid-cols-2 lg:items-center lg:py-16">
        <div className="flex flex-col gap-2">
          <p className="type-eyebrow text-ink-subtle">Stay close</p>
          <h2 id="newsletter-title" className="type-h2">
            New arrivals and styling notes, twice a month
          </h2>
          <p className="type-body text-ink-muted">Early access to drops and the journal. No noise.</p>
        </div>
        <div className="lg:max-w-md lg:justify-self-end lg:w-full">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
