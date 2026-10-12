"use client";

import * as React from "react";
import Link from "next/link";
import { PlayIcon, Volume2Icon, VolumeXIcon } from "lucide-react";

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

type CardProps = {
  item: HomeReelItem;
  autoplay: boolean;
  soundOn: boolean;
  onSound: (on: boolean) => void;
};

function ReelCard({ item, autoplay, soundOn, onSound }: CardProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);

  // Play only while most of the card is on screen, so a phone never streams four clips at once.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoplay) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= 0.6) video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [autoplay]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = !soundOn;
  }, [soundOn]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <article className="group/reel relative aspect-[9/16] overflow-hidden rounded-md bg-image-scrim">
      <video
        ref={videoRef}
        src={item.src}
        poster={item.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={item.title}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 size-full object-cover"
      >
        {item.caption}
      </video>

      {/* Caption band; the whole card opens the category. */}
      <Link
        href={item.href}
        aria-label={`${item.title}: ${item.cta}`}
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-image-scrim/75 via-image-scrim/10 to-transparent p-4 text-on-image outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-image"
      >
        <span className="type-small font-medium leading-snug">{item.title}</span>
        <span className="type-small mt-1 underline decoration-on-image/50 underline-offset-4 transition-colors group-hover/reel:decoration-on-image">{item.cta} →</span>
      </Link>

      {!autoplay ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
          className={cn(
            "absolute top-1/2 left-1/2 inline-flex size-14 -translate-1/2 items-center justify-center rounded-full border border-on-image/50 bg-image-scrim/40 text-on-image backdrop-blur transition-opacity hover:bg-image-scrim/60",
            playing && "opacity-0 focus-visible:opacity-100",
          )}
        >
          <PlayIcon className="size-6" aria-hidden="true" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onSound(!soundOn)}
        aria-pressed={soundOn}
        aria-label={soundOn ? `Mute ${item.title}` : `Unmute ${item.title}`}
        className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full border border-on-image/40 bg-image-scrim/40 text-on-image backdrop-blur transition-colors hover:bg-image-scrim/60 focus-visible:ring-2 focus-visible:ring-on-image focus-visible:outline-none"
      >
        {soundOn ? <Volume2Icon className="size-4" aria-hidden="true" /> : <VolumeXIcon className="size-4" aria-hidden="true" />}
      </button>
    </article>
  );
}

/**
 * "Kesa in motion": short vertical product films. A swipeable row on
 * phones, four across from `md`. Clips start muted and only while on
 * screen; one clip at a time can have its sound on.
 */
export function VideoReel({ items }: VideoReelProps) {
  const autoplay = useAutoplayAllowed();
  const [soundId, setSoundId] = React.useState<string | null>(null);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="reel-title" className="container-page reveal">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-prose flex-col gap-2">
          <p className="type-eyebrow text-ink-subtle">Kesa in motion</p>
          <h2 id="reel-title" className="type-h2">See them sparkle</h2>
          <p className="type-body text-ink-muted">Ten seconds with each piece, the way it moves when you wear it.</p>
        </div>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {items.map((item) => (
          <li key={item.id} className="w-[68vw] shrink-0 snap-center sm:w-[40vw] md:w-auto">
            <ReelCard item={item} autoplay={autoplay} soundOn={soundId === item.id} onSound={(on) => setSoundId(on ? item.id : null)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
