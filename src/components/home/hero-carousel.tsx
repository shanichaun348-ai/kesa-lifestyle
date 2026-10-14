"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Parallax } from "@/components/motion/tilt";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  /** Landscape banner artwork, produced at 2.4:1 (2560×1067) with copy set in the image. */
  src: string;
  /** Optional portrait version, produced at 4:5 (1080×1350), used on phones instead of `src`. */
  mobileSrc?: string | undefined;
  /** Spoken copy for the slide — repeat the headline that is baked into the artwork. */
  alt: string;
  href: string;
  /** Accessible label for the whole-slide link, e.g. "Shop Pillars of Time". */
  cta: string;
};

/**
 * The artwork is produced in the slide's exact shape, so it is drawn with
 * `object-cover`: it fills the box edge to edge and, where a file is a little
 * off-ratio, loses a sliver at the edges (the art keeps its copy away from
 * them) rather than showing bars or a blurred fill.
 */
function SlideImage({ src, alt, priority, className }: { src: string; alt: string; priority: boolean; className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-image-scrim", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        sizes="100vw"
        quality={85}
        className="parallax-layer object-cover object-center"
      />
    </div>
  );
}

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
      className="group/hero relative isolate overflow-hidden bg-image-scrim"
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
            <Link href={slide.href} aria-label={slide.cta} className="block outline-none focus-visible:[&>div]:ring-4 focus-visible:[&>div]:ring-inset focus-visible:[&>div]:ring-on-image/70">
              {/* Fixed shapes the artwork is produced for: 2.4:1 banners (2560×1067) on tablets and up, 4:5 portrait
                  (1080×1350) on phones when a portrait file exists. */}
              <Parallax className={cn("relative w-full aspect-[12/5]", slide.mobileSrc && "max-sm:aspect-[4/5]")}>
                {slide.mobileSrc ? (
                  <>
                    <SlideImage src={slide.mobileSrc} alt={slide.alt} priority={i === 0} className="sm:hidden" />
                    <SlideImage src={slide.src} alt={slide.alt} priority={i === 0} className="hidden sm:block" />
                  </>
                ) : (
                  <SlideImage src={slide.src} alt={slide.alt} priority={i === 0} />
                )}
                {/* Showcase lamp: lights the artwork under the cursor (pointer-fine only, see .hero-spotlight). */}
                <span aria-hidden="true" className="hero-spotlight pointer-events-none absolute inset-0 z-[2]" />
              </Parallax>
            </Link>
          </li>
        ))}
      </ul>

      {/* Gold hairline frame that draws itself on load; sits over the slides, under the controls. */}
      <svg
        aria-hidden="true"
        className="hero-frame pointer-events-none absolute inset-3 z-[3] lg:inset-5"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        focusable="false"
      >
        <rect x="0.5" y="0.5" width="100%" height="100%" fill="none" strokeWidth="1" pathLength={1} vectorEffect="non-scaling-stroke" />
      </svg>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-on-image/40 bg-image-scrim/30 text-on-image opacity-0 backdrop-blur transition-[opacity,background-color] duration-250 hover:bg-image-scrim/60 focus-visible:opacity-100 group-hover/hero:opacity-100 md:inline-flex lg:left-6"
          >
            <ChevronLeftIcon className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-on-image/40 bg-image-scrim/30 text-on-image opacity-0 backdrop-blur transition-[opacity,background-color] duration-250 hover:bg-image-scrim/60 focus-visible:opacity-100 group-hover/hero:opacity-100 md:inline-flex lg:right-6"
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
                    "block h-1 rounded-full bg-on-image/70 transition-[width,background-color] duration-400 ease-(--ease-standard) group-focus-visible/dot:ring-2 group-focus-visible/dot:ring-on-image",
                    i === index ? "w-8 bg-on-image" : "w-2 group-hover/dot:bg-on-image",
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
