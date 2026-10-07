import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { DemoImage } from "@/lib/demo/homepage";

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

type HeroProps = {
  eyebrow?: string | undefined;
  title: string;
  lead: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string } | undefined;
  image: DemoImage;
};

/**
 * Full-bleed campaign hero. The photograph fills the viewport width with a
 * slow zoom; copy sits over a bottom-left gradient so contrast never depends
 * on the image. The image is the LCP element and loads with priority.
 */
export function Hero({ eyebrow, title, lead, primary, secondary, image }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-ink text-bg">
      <div className="relative aspect-[4/5] min-h-[32rem] sm:aspect-[16/10] lg:aspect-[21/9] lg:min-h-[36rem] lg:max-h-[46rem]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          unoptimized={image.unoptimized ?? false}
          className="ken-burns object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/10 sm:bg-gradient-to-r sm:from-ink/85 sm:via-ink/40 sm:to-transparent" />
      </div>

      <div className="container-page absolute inset-x-0 bottom-0 pb-10 sm:inset-y-0 sm:flex sm:flex-col sm:justify-center sm:pb-0">
        <div className="flex max-w-2xl flex-col items-start gap-5">
          {eyebrow ? (
            <p className="rise type-eyebrow text-bg/80" style={stagger(0)}>
              {eyebrow}
            </p>
          ) : null}
          <h1 id="hero-title" className="rise type-display text-balance" style={stagger(1)}>
            {title}
          </h1>
          <p className="rise type-lead max-w-md text-bg/85" style={stagger(2)}>
            {lead}
          </p>
          <div className="rise mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={stagger(3)}>
            <Button size="lg" asChild className="border-bg bg-bg text-ink hover:border-surface-muted hover:bg-surface-muted">
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
            {secondary ? (
              <Button size="lg" variant="secondary" asChild className="border-bg/80 text-bg hover:border-bg hover:bg-bg hover:text-ink">
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
