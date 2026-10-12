"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, Volume2Icon, VolumeXIcon } from "lucide-react";

import type { HomeReelItem } from "@/lib/home-reel";
import { cn } from "@/lib/utils";

type VideoReelProps = {
  items: readonly HomeReelItem[];
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function autoplayNow(): boolean {
  const reduced = window.matchMedia(REDUCED_MOTION).matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return !reduced && !saveData;
}

/** Autoplay is skipped when the viewer asked for less motion or less data; they tap to play instead. Server-rendered as off. */
function useAutoplayAllowed(): boolean {
  return React.useSyncExternalStore(subscribeMotion, autoplayNow, () => false);
}

const ARROW =
  "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-surface/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:inline-flex";
const ICON_BUTTON =
  "inline-flex items-center justify-center rounded-full border border-on-image/40 bg-image-scrim/40 text-on-image backdrop-blur transition-colors hover:bg-image-scrim/60 focus-visible:ring-2 focus-visible:ring-on-image focus-visible:outline-none";

/** The films are laid out three times so there is always a neighbour on both sides; the middle copy is the real one. */
const SETS = 3;

/**
 * "Kesa in motion": short vertical product films in a centre-stage
 * carousel. The middle card is full size and plays; its neighbours sit
 * smaller and dimmed at the sides. Native scroll-snap does the swiping, so
 * it works without JavaScript; the script scales cards by their distance
 * from the centre, drives the arrows, plays only the centre clip, moves on
 * to the next when it ends, and loops by jumping between identical copies
 * of the row once a scroll settles.
 */
export function VideoReel({ items }: VideoReelProps) {
  const autoplay = useAutoplayAllowed();
  const trackRef = React.useRef<HTMLUListElement>(null);
  const cardRefs = React.useRef<Array<HTMLLIElement | null>>([]);
  const videoRefs = React.useRef<Array<HTMLVideoElement | null>>([]);
  const count = items.length;
  /** Position in the tripled row; the film is `position % count`. Starts on the first film of the middle copy. */
  const [position, setPosition] = React.useState(count);
  const [soundOn, setSoundOn] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const active = count > 0 ? position % count : 0;

  const centreOn = React.useCallback((p: number, behavior: ScrollBehavior) => {
    const track = trackRef.current;
    const card = cardRefs.current[p];
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior });
  }, []);

  const goTo = React.useCallback((p: number) => centreOn(p, "smooth"), [centreOn]);

  // Start on the middle copy, then: each card's distance from the track centre (0 = centred,
  // 1 = a full card away) drives its size via --d; once a scroll settles in an outer copy,
  // jump silently to the same film in the middle copy so the row never runs out.
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;
    let frame = 0;
    let settle = 0;
    const nearestCard = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let nearestGap = Number.POSITIVE_INFINITY;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const gap = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid);
        card.style.setProperty("--d", Math.min(1, gap / card.offsetWidth).toFixed(3));
        if (gap < nearestGap) {
          nearestGap = gap;
          nearest = i;
        }
      });
      return nearest;
    };
    const update = () => {
      const nearest = nearestCard();
      setPosition((current) => (current === nearest ? current : nearest));
    };
    const onSettled = () => {
      const nearest = nearestCard();
      const first = cardRefs.current[0];
      const firstOfNext = cardRefs.current[count];
      if (!first || !firstOfNext) return;
      const setWidth = firstOfNext.offsetLeft - first.offsetLeft;
      if (nearest < count) track.scrollLeft += setWidth;
      else if (nearest >= 2 * count) track.scrollLeft -= setWidth;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
      window.clearTimeout(settle);
      settle = window.setTimeout(onSettled, 160);
    };
    const start = requestAnimationFrame(() => {
      centreOn(count, "instant");
      schedule();
    });
    track.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      track.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(start);
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [count, centreOn]);

  // Only the centre clip plays; the others hold their poster frame.
  React.useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      video.muted = !(soundOn && i === position);
      if (i === position && autoplay) video.play().catch(() => undefined);
      else if (i !== position) video.pause();
    });
  }, [position, autoplay, soundOn]);

  if (count === 0) return null;

  const togglePlay = () => {
    const video = videoRefs.current[position];
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <section aria-labelledby="reel-title" className="container-page reveal">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-prose flex-col gap-2">
          <p className="type-eyebrow text-ink-subtle">Kesa in motion</p>
          <h2 id="reel-title" className="type-h2">See them sparkle</h2>
          <p className="type-body text-ink-muted">Ten seconds with each piece, the way it moves when you wear it.</p>
        </div>
      </div>

      <div className="relative" aria-roledescription="carousel" aria-label="Product films">
        <button type="button" onClick={() => goTo(position - 1)} aria-label="Previous film" className={cn(ARROW, "left-2 lg:left-4")}>
          <ChevronLeftIcon className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => goTo(position + 1)} aria-label="Next film" className={cn(ARROW, "right-2 lg:right-4")}>
          <ChevronRightIcon className="size-5" aria-hidden="true" />
        </button>

        {/* --card is the centre card's width; the side padding lets the first and last card reach the middle. */}
        <ul
          ref={trackRef}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[calc(50%-var(--card)/2)] py-2 [--card:66vw] sm:gap-4 sm:[--card:40vw] md:mx-0 md:[--card:clamp(240px,27vw,360px)]"
          aria-live={playing ? "off" : "polite"}
        >
          {Array.from({ length: SETS }, (_, set) => items.map((item, index) => ({ item, index, set, p: set * count + index })))
            .flat()
            .map(({ item, index, set, p }) => {
            const isActive = p === position;
            const isCopy = set !== 1;
            return (
              <li
                key={`${item.id}-${set}`}
                ref={(el) => {
                  cardRefs.current[p] = el;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}: ${item.title}`}
                aria-hidden={isCopy || undefined}
                style={{ "--d": p === count ? 0 : 1 } as React.CSSProperties}
                className="w-(--card) shrink-0 snap-center opacity-[calc(1-0.45*var(--d))] [transform:scale(calc(1-0.16*var(--d)))] transition-[opacity] duration-200 ease-(--ease-standard)"
              >
                <article className="group/reel relative aspect-[9/16] overflow-hidden rounded-md bg-image-scrim shadow-sm">
                  <video
                    ref={(el) => {
                      videoRefs.current[p] = el;
                    }}
                    src={item.src}
                    poster={item.poster}
                    muted
                    loop={!autoplay}
                    playsInline
                    preload={p === count ? "metadata" : "none"}
                    aria-label={item.title}
                    onPlay={() => isActive && setPlaying(true)}
                    onPause={() => isActive && setPlaying(false)}
                    onEnded={() => goTo(p + 1)}
                    className="absolute inset-0 size-full object-cover"
                  >
                    {item.caption}
                  </video>

                  {/* Caption band; the centre card opens its category, a side card slides to the centre first. */}
                  <Link
                    href={item.href}
                    tabIndex={isActive ? 0 : -1}
                    aria-label={`${item.title}: ${item.cta}`}
                    onClick={(e) => {
                      if (!isActive) {
                        e.preventDefault();
                        goTo(p);
                      }
                    }}
                    className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-image-scrim/75 via-image-scrim/10 to-transparent p-4 text-on-image outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-image"
                  >
                    <span className="type-small font-medium leading-snug">{item.title}</span>
                    <span className="type-small mt-1 underline decoration-on-image/50 underline-offset-4 transition-colors group-hover/reel:decoration-on-image">{item.cta} →</span>
                  </Link>

                  {isActive && !autoplay ? (
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
                      className={cn(ICON_BUTTON, "absolute top-1/2 left-1/2 size-14 -translate-1/2", playing && "opacity-0 focus-visible:opacity-100")}
                    >
                      <PlayIcon className="size-6" aria-hidden="true" />
                    </button>
                  ) : null}

                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => setSoundOn((on) => !on)}
                      aria-pressed={soundOn}
                      aria-label={soundOn ? `Mute ${item.title}` : `Unmute ${item.title}`}
                      className={cn(ICON_BUTTON, "absolute top-3 right-3 size-9")}
                    >
                      {soundOn ? <Volume2Icon className="size-4" aria-hidden="true" /> : <VolumeXIcon className="size-4" aria-hidden="true" />}
                    </button>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Choose a film">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={item.title}
              onClick={() => goTo(count + i)}
              className={cn("h-1.5 rounded-full transition-[width,background-color] duration-200", i === active ? "w-8 bg-ink" : "w-3 bg-line-strong hover:bg-ink-subtle")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
