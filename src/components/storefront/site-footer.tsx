import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";

import { NewsletterForm } from "@/components/storefront/newsletter-form";
import type { FooterColumn } from "@/lib/navigation";
import { whatsappHref } from "@/lib/site";

type SiteFooterProps = {
  columns: FooterColumn[];
  /** Digits-only WhatsApp number for the footer link; the built-in number when omitted. */
  whatsappNumber?: string;
};

/**
 * Footer. Columns collapse into native <details> accordions on phones
 * (no JavaScript, keyboard accessible by default).
 */
export function SiteFooter({ columns, whatsappNumber }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-surface-muted/60">
      <div className="container-page py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)] lg:gap-12">
          {columns.map((col) => (
            <details key={col.heading} className="group border-b border-line lg:border-0 lg:[&>summary]:pointer-events-none" open>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-medium text-ink lg:mb-4 lg:min-h-0 lg:cursor-default [&::-webkit-details-marker]:hidden">
                <span className="type-eyebrow">{col.heading}</span>
                <ChevronDownIcon
                  className="size-4 text-ink-muted transition-transform group-open:rotate-180 lg:hidden"
                  aria-hidden="true"
                />
              </summary>
              <ul className="flex flex-col gap-1 pb-4 lg:pb-0">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="inline-flex min-h-9 items-center text-sm text-ink-muted hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}

          <div className="lg:pl-6">
            <p className="type-eyebrow mb-4 text-ink">Stay in touch</p>
            <NewsletterForm />
            <ul className="mt-6 flex items-center gap-4" aria-label="Social">
              {([
                { name: "Instagram", href: "https://www.instagram.com/kesalifestyle/" },
                { name: "Pinterest", href: "#" },
                { name: "YouTube", href: "#" },
              ] as const).map(({ name, href }) => (
                <li key={name}>
                  <a href={href} target={href !== "#" ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                    {name}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={whatsappHref("Hi Kesa Lifestyle, I have a question about your jewellery.", whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Kesa Lifestyle. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/privacy-policy/" className="hover:text-ink">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms/" className="hover:text-ink">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/shipping-policy/" className="hover:text-ink">
                Shipping
              </Link>
            </li>
            <li>
              <Link href="/returns-policy/" className="hover:text-ink">
                Returns
              </Link>
            </li>
            <li>
              <Link href="/grievance-officer/" className="hover:text-ink">
                Grievance officer
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
