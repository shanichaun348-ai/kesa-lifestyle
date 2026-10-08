"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type HeroSlide = {
  /** Banner artwork with the campaign copy already set in the image. */
  src: string;
  /** Spoken copy for the slide — repeat the headline that is baked into the artwork. */
  alt: string;
  href: string;
  /** Accessible label for the whole-slide link, e.g. "Shop Pillars of Time". */
  cta: string;
  /** Horizontal focal point for portrait crops on phones (0–100, default 50). */
  focusX?: number | undefined;
  /** Vertical focal point for wide crops on desktop (0–100, default 50). */
  focusY?: number | undefined;
};

type HeroCarouselProps = {
  slides: readonly HeroSlide[];
  /** Milliseconds between auto-advances; 0 disables autoplay. */
  interval?: number;
};

/**
 * Full-bleed campaign banner carousel. Native scroll-snap does the swiping,
 * so it works without JavaScript; the script only adds autoplay, arrows and
 * dots. Autoplay pauses on hover/focus, when the tab is hidden, and never
 * runs for users who prefer reduced motion.
 */
export function HeroCarousel({ slides, interval = 6000 }: HeroCarouselProps) {
  const trackRef = React.useRef<HTMLUListElement>(null);
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const count = slides.length;

  const goTo = React.useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const next = ((i % count) + count) % count;
      track.scrollTo({ left: next * track.clientWidth, behavior });
    },
    [count],
  );

  // Keep `index` in sync with manual swipes.
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Autoplay.
  React.useEffect(() => {
    if (interval <= 0 || count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") goTo(index + 1);
    }, interval);
    return () => window.clearInterval(id);
  }, [interval, count, paused, index, goTo]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured campaigns"
      className="group/hero relative isolate overflow-hidden bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <ul
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        aria-live={paused ? "polite" : "off"}
      >
        {slides.map((slide, i) => (
          <li
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className="relative w-full shrink-0 snap-start"
          >
            <Link href={slide.href} aria-label={slide.cta} className="block outline-none focus-visible:[&>div]:ring-4 focus-visible:[&>div]:ring-inset focus-visible:[&>div]:ring-bg/70">
              <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[2/1] lg:max-h-[44rem]">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={i === 0}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="100vw"
                  quality={82}
                  className="object-cover"
                  style={{ objectPosition: `${slide.focusX ?? 50}% ${slide.focusY ?? 50}%` }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-bg/40 bg-ink/30 text-bg opacity-0 backdrop-blur transition-[opacity,background-color] duration-250 hover:bg-ink/60 focus-visible:opacity-100 group-hover/hero:opacity-100 md:inline-flex lg:left-6"
          >
            <ChevronLeftIcon className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-bg/40 bg-ink/30 text-bg opacity-0 backdrop-blur transition-[opacity,background-color] duration-250 hover:bg-ink/60 focus-visible:opacity-100 group-hover/hero:opacity-100 md:inline-flex lg:right-6"
          >
            <ChevronRightIcon className="size-5" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 lg:bottom-6" role="tablist" aria-label="Choose slide">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className="group/dot inline-flex h-6 items-center px-1 outline-none"
              >
                <span
                  className={cn(
                    "block h-1 rounded-full bg-bg/70 transition-[width,background-color] duration-400 ease-(--ease-standard) group-focus-visible/dot:ring-2 group-focus-visible/dot:ring-bg",
                    i === index ? "w-8 bg-bg" : "w-2 group-hover/dot:bg-bg",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
