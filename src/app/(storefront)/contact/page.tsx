import type { Metadata } from "next";
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { WhatsAppIcon } from "@/components/storefront/whatsapp-button";
import { telHref, whatsappDigits } from "@/modules/content/contact";
import { getContact } from "@/modules/content/contact-server";
import { site, WHATSAPP_NUMBER } from "@/lib/site";

// The details are edited in Admin → Content → Contact us page; saving there refreshes this page straight away.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `Contact Us | ${site.name}` },
  description: `Reach ${site.name} for help with an order, sizing, gifting or any piece: phone, WhatsApp, email and opening hours.`,
  alternates: { canonical: "/contact/" },
  robots: { index: true, follow: true },
};

const CARD = "flex gap-4 rounded-md border border-line bg-surface p-5";
const ICON = "mt-0.5 size-5 shrink-0 text-highlight";
const LINK = "text-brand underline-offset-4 hover:underline";

export default async function ContactPage() {
  const { value: contact } = await getContact();
  const whatsapp = whatsappDigits(contact, WHATSAPP_NUMBER);
  const whatsappLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi ${site.name}, I have a question.`)}`;
  const hasAnything = contact.phone || contact.whatsapp || contact.email || contact.address || contact.hours;

  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact us" }]} />

      <header className="mt-6 max-w-2xl">
        <h1 className="type-h1">Contact us</h1>
        {contact.intro ? <p className="mt-3 type-body text-ink-muted">{contact.intro}</p> : null}
      </header>

      {hasAnything ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:max-w-4xl">
          {contact.whatsapp ? (
            <li className={CARD}>
              <WhatsAppIcon className="mt-0.5 size-5 shrink-0 text-highlight" />
              <div>
                <h2 className="text-sm font-medium text-ink">WhatsApp</h2>
                <p className="mt-1 text-sm text-ink-muted">The quickest way to reach us.</p>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block text-sm ${LINK}`}>
                  Chat on WhatsApp
                </a>
              </div>
            </li>
          ) : null}
          {contact.phone ? (
            <li className={CARD}>
              <PhoneIcon className={ICON} aria-hidden="true" />
              <div>
                <h2 className="text-sm font-medium text-ink">Call us</h2>
                <a href={telHref(contact.phone)} className={`mt-1 inline-block text-sm ${LINK}`}>
                  {contact.phone}
                </a>
              </div>
            </li>
          ) : null}
          {contact.email ? (
            <li className={CARD}>
              <MailIcon className={ICON} aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-ink">Email</h2>
                <a href={`mailto:${contact.email}`} className={`mt-1 inline-block break-all text-sm ${LINK}`}>
                  {contact.email}
                </a>
              </div>
            </li>
          ) : null}
          {contact.hours ? (
            <li className={CARD}>
              <ClockIcon className={ICON} aria-hidden="true" />
              <div>
                <h2 className="text-sm font-medium text-ink">Opening hours</h2>
                <p className="mt-1 text-sm text-ink-muted">{contact.hours}</p>
              </div>
            </li>
          ) : null}
          {contact.address ? (
            <li className={`${CARD} sm:col-span-2`}>
              <MapPinIcon className={ICON} aria-hidden="true" />
              <div>
                <h2 className="text-sm font-medium text-ink">Address</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{contact.address}</p>
                {contact.mapUrl ? (
                  <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block text-sm ${LINK}`}>
                    Get directions
                  </a>
                ) : null}
              </div>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-10 type-body text-ink-muted">Contact details are coming soon.</p>
      )}
    </Container>
  );
}
