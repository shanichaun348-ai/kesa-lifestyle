"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, Volume2Icon, VolumeXIcon } from "lucide-react";

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

/** The films are laid out three times so there is always a neighbour on both sides; the middle copy is the real one. */
const SETS = 3;

const ARROW =
  "absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-highlight/60 bg-surface/80 text-highlight backdrop-blur transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight md:inline-flex";
const BADGE =
  "inline-flex items-center justify-center rounded-full border border-on-image/60 bg-image-scrim/45 text-on-image backdrop-blur transition-colors hover:bg-image-scrim/70 focus-visible:ring-2 focus-visible:ring-on-image-gold focus-visible:outline-none";

/**
 * "Kesa in motion": short vertical product films on the plain page background.
 * Each film sits in an arch-topped gold frame with its name and a shop
 * button underneath; the middle frame is full size and playing,
 * its neighbours smaller and dimmed. Native scroll-snap does the swiping,
 * so it works without JavaScript; the script scales cards by their
 * distance from the centre, drives the arrows, plays only the centre clip,
 * moves on to the next when it ends, and loops by jumping between
 * identical copies of the row once a scroll settles.
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
    <section aria-labelledby="reel-title" className="relative isolate overflow-hidden py-12 lg:py-16">
      <div className="container-page reveal relative">
        <div className="mb-8 flex max-w-prose flex-col gap-2 lg:mb-10">
          <p className="type-eyebrow text-highlight">Kesa in motion</p>
          <h2 id="reel-title" className="type-h2 flex items-center gap-3 text-highlight">
            See them sparkle
            <span aria-hidden="true" className="flex items-center gap-2 text-base">
              ✦<span className="block h-px w-16 bg-highlight/60" />
            </span>
          </h2>
          <p className="type-body text-ink-muted">Ten seconds with each piece, the way it moves when you wear it.</p>
        </div>
      </div>

      {/* The row runs the full width of the screen (outside the page container); the centre film is full size and
          the others shrink and fade towards the edges. */}
      <div className="reveal relative" aria-roledescription="carousel" aria-label="Product films">
          <button type="button" onClick={() => goTo(position - 1)} aria-label="Previous film" className={cn(ARROW, "left-0 lg:left-2")}>
            <ChevronLeftIcon className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => goTo(position + 1)} aria-label="Next film" className={cn(ARROW, "right-0 lg:right-2")}>
            <ChevronRightIcon className="size-5" aria-hidden="true" />
          </button>

          {/* --card is the centre card's width; the side padding lets the first and last card reach the middle. */}
          <ul
            ref={trackRef}
            className="no-scrollbar flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-[calc(50%-var(--card)/2)] py-4 [--card:66vw] sm:gap-5 sm:[--card:40vw] md:[--card:clamp(240px,20vw,400px)]"
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
                    className="relative w-(--card) shrink-0 snap-center opacity-[calc(1-0.45*var(--d))] [transform:scale(calc(1-0.12*var(--d)))] transition-[opacity] duration-200 ease-(--ease-standard)"
                  >
                    <article
                      className={cn(
                        "group/reel film-frame-inner relative overflow-hidden rounded-sm bg-image-scrim ring-1 transition-shadow duration-300",
                        isActive ? "ring-on-image-gold" : "ring-on-image-gold/60",
                      )}
                    >
                      {/* Corner ornaments of the gold frame. */}
                      {(["top-1.5 left-1.5", "top-1.5 right-1.5", "bottom-1.5 left-1.5", "bottom-1.5 right-1.5"] as const).map((corner) => (
                        <span key={corner} aria-hidden="true" className={cn("pointer-events-none absolute z-10 text-[11px] leading-none text-on-image-gold", corner)}>
                          ✦
                        </span>
                      ))}

                      <div className="relative aspect-[5/8]">
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

                        {/* Tapping the film: a side card slides to the centre, the centre card pauses or resumes. */}
                        <button
                          type="button"
                          tabIndex={isCopy ? -1 : 0}
                          onClick={() => (isActive ? togglePlay() : goTo(p))}
                          aria-label={isActive ? (playing ? `Pause ${item.title}` : `Play ${item.title}`) : `Show ${item.title}`}
                          className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-image-scrim/85 via-image-scrim/10 to-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-image-gold"
                        >
                          <span className={cn(BADGE, "size-14 border-on-image-gold/70 text-on-image-gold transition-opacity", isActive && playing && "opacity-0 group-hover/reel:opacity-100")}>
                            {isActive && playing ? <PauseIcon className="size-5" aria-hidden="true" /> : <PlayIcon className="ml-0.5 size-5" aria-hidden="true" />}
                          </span>
                        </button>

                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => setSoundOn((on) => !on)}
                            aria-pressed={soundOn}
                            aria-label={soundOn ? `Mute ${item.title}` : `Unmute ${item.title}`}
                            className={cn(BADGE, "absolute top-4 right-4 size-9")}
                          >
                            {soundOn ? <Volume2Icon className="size-4" aria-hidden="true" /> : <VolumeXIcon className="size-4" aria-hidden="true" />}
                          </button>
                        ) : null}

                        {/* Name and shop link over the foot of the film. */}
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-5 pt-10 sm:px-6 sm:pb-6">
                          <div className="min-w-0">
                            <h3 className="font-display text-lg leading-snug text-on-image sm:text-xl">{item.title}</h3>
                            <Link
                              href={item.href}
                              tabIndex={isCopy ? -1 : 0}
                              aria-label={`${item.title}: ${item.cta}`}
                              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.18em] text-on-image-gold underline decoration-on-image-gold/60 underline-offset-[6px] transition-colors hover:text-on-image hover:decoration-on-image focus-visible:ring-2 focus-visible:ring-on-image-gold focus-visible:outline-none"
                            >
                              {item.cta} →
                            </Link>
                          </div>
                          <span aria-hidden="true" className="shrink-0 pb-0.5 text-sm text-on-image-gold">✦</span>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
          </ul>

          <div className="mt-2 flex justify-center gap-2" role="tablist" aria-label="Choose a film">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={item.title}
                onClick={() => goTo(count + i)}
                className={cn("h-1.5 rounded-full transition-[width,background-color] duration-200", i === active ? "w-8 bg-highlight" : "w-3 bg-ink/25 hover:bg-ink/50")}
              />
            ))}
          </div>
      </div>
    </section>
  );
}
