"use client";

import { usePathname } from "next/navigation";

import { site, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

/** WhatsApp's speech-bubble glyph (brand mark, drawn inline — lucide has no WhatsApp icon). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.3.7 4.6 1.9 6.5L4 29l7.8-1.9c1.9 1 4 1.5 6.2 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.7c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.6 1.1 1.2-4.4-.3-.4a9.7 9.7 0 0 1-1.6-5.4C4.9 9.4 9.9 4.9 16 4.9s11.1 4.5 11.1 10c0 5.4-5 9.8-11.1 9.8zm6-7.3c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.5c-.3-.6-.5-.5-.8-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6 0-.2-.3-.3-.6-.4z" />
    </svg>
  );
}

const HIDDEN_ON = ["/checkout", "/admin"];

/**
 * Floating "Chat on WhatsApp" button. Pre-fills a message that names the page
 * the shopper is on so the reply has context. Sits above the mobile sticky
 * add-to-bag bar; hidden during checkout so it never covers the pay button.
 */
export function WhatsAppButton() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const message =
    pathname === "/"
      ? `Hi ${site.name}, I have a question about your jewellery.`
      : `Hi ${site.name}, I have a question about this page: ${site.url.replace(/\/$/, "")}${pathname}`;

  return (
    <a
      href={whatsappHref(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "group/wa fixed right-4 z-30 flex h-13 items-center gap-0 rounded-full bg-[#25D366] text-white shadow-(--shadow-overlay)",
        "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6",
        "transition-[transform,box-shadow] duration-250 ease-(--ease-standard) motion-safe:hover:-translate-y-0.5 hover:shadow-(--shadow-float)",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]",
      )}
    >
      <span className="inline-flex size-13 shrink-0 items-center justify-center">
        <WhatsAppIcon className="size-7" />
      </span>
      <span className="hidden max-w-0 overflow-hidden pr-0 text-sm font-medium whitespace-nowrap transition-[max-width,padding] duration-300 ease-(--ease-standard) group-hover/wa:max-w-40 group-hover/wa:pr-5 group-focus-visible/wa:max-w-40 group-focus-visible/wa:pr-5 lg:inline-block">
        Chat with us
      </span>
    </a>
  );
}
