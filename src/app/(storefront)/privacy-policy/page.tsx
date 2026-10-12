import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Kesa Lifestyle collects, uses and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <div className="mx-auto mt-8 max-w-2xl space-y-8 prose-sm">
        <h1 className="type-h1">Privacy Policy</h1>
        <p className="text-ink-subtle text-sm">Last updated: October 2025</p>

        <section className="space-y-3">
          <h2 className="type-h3">1. Information we collect</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            When you place an order we collect your name, email address, phone number and shipping address. We also collect browsing data (pages visited, device type) to improve the store experience.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">2. How we use your information</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-ink-muted">
            <li>To process and fulfil your order</li>
            <li>To send order confirmation and shipping updates</li>
            <li>To respond to customer service enquiries</li>
            <li>To send marketing communications (only with your consent)</li>
            <li>To remind you about items left in your bag — only if you tick the reminder box at checkout. We keep that copy of your bag for up to 7 days, send at most two reminders, and every reminder has a one-click stop link</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">3. Payment information</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            All payments are processed by Razorpay. We never store your card details on our servers. Razorpay is PCI-DSS compliant. Please refer to Razorpay&rsquo;s privacy policy for information on how they handle your payment data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">4. Sharing your information</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            We do not sell or rent your personal data. We share it only with trusted service providers (logistics partners, payment processor) to fulfil your order, and as required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">5. Cookies</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            We use cookies for session management, analytics (Google Analytics) and marketing. You can disable cookies in your browser settings; this may affect some store functionality.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">6. Data retention</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Order records are retained for seven years as required by Indian tax law. Marketing consent records are retained until you withdraw consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">7. Your rights</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            You have the right to access, correct or request deletion of your personal data. Email us at <a href="mailto:hello@kesalifestyle.com" className="text-brand hover:underline">hello@kesalifestyle.com</a> and we will respond within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-h3">8. Contact</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Kesa Lifestyle<br />
            Email: <a href="mailto:hello@kesalifestyle.com" className="text-brand hover:underline">hello@kesalifestyle.com</a>
          </p>
        </section>
      </div>
    </Container>
  );
}
