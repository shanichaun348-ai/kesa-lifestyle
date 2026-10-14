import type * as React from "react";

import { cn } from "@/lib/utils";

type HeroMastheadProps = {
  kicker?: string;
  headline: string;
  lead?: string | undefined;
  className?: string | undefined;
};

function words(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Editorial masthead under the hero carousel and the page's only <h1>. The
 * headline rises word by word (CSS only, staggered with --i), then a gold
 * glint sweeps across it once. The glint is a transparent, aria-hidden copy
 * of the heading laid exactly over it, so the per-word motion and the
 * text-clipped gradient never interfere. Reduced motion shows plain text.
 */
export function HeroMasthead({ kicker = "Kesa Lifestyle", headline, lead, className }: HeroMastheadProps) {
  const parts = words(headline);
  const line = parts.join(" ");

  return (
    <section aria-labelledby="hero-headline" className={cn("container-page flex flex-col items-center gap-3 py-10 text-center lg:gap-4 lg:py-14", className)}>
      <p className="type-eyebrow rise text-highlight" style={{ "--i": 0 } as React.CSSProperties}>
        {kicker}
      </p>
      <div className="relative max-w-4xl">
        <h1 id="hero-headline" className="type-display text-balance">
          {parts.map((word, i) => (
            <span key={`${word}-${i}`}>
              <span className="word-reveal" style={{ "--i": i + 1 } as React.CSSProperties}>
                {word}
              </span>
              {i < parts.length - 1 ? " " : null}
            </span>
          ))}
        </h1>
        <span aria-hidden="true" className="hero-sheen type-display absolute inset-0 text-balance">
          {line}
        </span>
      </div>
      {lead ? (
        <p className="type-body rise max-w-xl text-ink-muted" style={{ "--i": parts.length + 1 } as React.CSSProperties}>
          {lead}
        </p>
      ) : null}
    </section>
  );
}
