"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, ZoomInIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ImageRef, ProductVideo } from "@/modules/catalog/types";
import { cn } from "@/lib/utils";

export type GalleryItem = { kind: "image"; image: ImageRef } | { kind: "video"; video: ProductVideo };

type ProductGalleryProps = {
  productName: string;
  items: GalleryItem[];
};

const STAGE_SIZES = "(min-width: 1024px) 50vw, 100vw";

/**
 * Gallery: snap-scrolling stage on phones with dots, thumbnail column on
 * desktop, and a lightbox with zoom. Only the first image is eager (LCP);
 * the rest lazy-load. Videos render a poster and load their player on tap.
 */
export function ProductGallery({ productName, items }: ProductGalleryProps) {
  const [active, setActive] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const stageRef = React.useRef<HTMLUListElement>(null);

  function scrollTo(index: number) {
    const stage = stageRef.current;
    const child = stage?.children[index];
    if (stage && child instanceof HTMLElement) stage.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    setActive(index);
  }

  function onStageScroll() {
    const stage = stageRef.current;
    if (!stage) return;
    const index = Math.round(stage.scrollLeft / stage.clientWidth);
    if (index !== active) setActive(Math.max(0, Math.min(items.length - 1, index)));
  }

  return (
    <div className="lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-4">
      {/* Thumbnails (desktop) */}
      <ul className="hidden lg:flex lg:flex-col lg:gap-2" aria-label="Choose image">
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={item.kind === "video" ? `Play video: ${item.video.title}` : `Show image ${i + 1}`}
              aria-current={active === i ? "true" : undefined}
              className={cn(
                "relative block aspect-[3/4] w-full overflow-hidden rounded-sm border bg-surface-muted",
                active === i ? "border-ink" : "border-transparent hover:border-line-strong",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              )}
            >
              <Image src={posterOf(item).src} alt="" fill sizes="72px" unoptimized={posterOf(item).unoptimized ?? false} className="object-cover" />
              {item.kind === "video" ? <PlayIcon className="absolute inset-0 m-auto size-5 text-on-image drop-shadow" aria-hidden="true" /> : null}
            </button>
          </li>
        ))}
      </ul>

      {/* Stage */}
      <div className="relative">
        <ul
          ref={stageRef}
          onScroll={onStageScroll}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto lg:mx-0 lg:overflow-hidden"
          aria-label={`${productName} images`}
        >
          {items.map((item, i) => (
            <li key={i} className="w-full shrink-0 snap-center px-4 lg:px-0">
              <figure className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-muted">
                {item.kind === "image" ? (
                  <>
                    <Image
                      src={item.image.src}
                      alt={item.image.alt}
                      fill
                      priority={i === 0}
                      fetchPriority={i === 0 ? "high" : "auto"}
                      sizes={STAGE_SIZES}
                      unoptimized={item.image.unoptimized ?? false}
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActive(i);
                        setOpen(true);
                      }}
                      aria-label={`Zoom image ${i + 1} of ${items.length}`}
                      className="absolute inset-0 cursor-zoom-in outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand"
                    >
                      <span className="absolute right-3 bottom-3 inline-flex size-9 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur-sm">
                        <ZoomInIcon className="size-4" aria-hidden="true" />
                      </span>
                    </button>
                  </>
                ) : (
                  <VideoStage video={item.video} />
                )}
                <figcaption className="sr-only">
                  {item.kind === "image" ? `Image ${i + 1} of ${items.length}` : `Video: ${item.video.title}`}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>

        {/* Dots (phones) */}
        {items.length > 1 ? (
          <ol className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-label="Gallery position">
            {items.map((_, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => scrollTo(i)}
                  aria-label={`Go to item ${i + 1}`}
                  aria-current={active === i ? "true" : undefined}
                  className={cn("block size-2 rounded-full transition-colors", active === i ? "bg-ink" : "bg-line-strong")}
                />
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <Lightbox open={open} onOpenChange={setOpen} items={items} index={active} setIndex={setActive} productName={productName} />
    </div>
  );
}

function posterOf(item: GalleryItem): ImageRef {
  return item.kind === "image" ? item.image : item.video.poster;
}

/** Poster first; the real player (or YouTube iframe) loads only on tap. */
function VideoStage({ video }: { video: ProductVideo }) {
  const [playing, setPlaying] = React.useState(false);
  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play video: ${video.title}`}
        className="absolute inset-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand"
      >
        <Image src={video.poster.src} alt={video.poster.alt} fill sizes={STAGE_SIZES} unoptimized={video.poster.unoptimized ?? false} className="object-cover" />
        <span className="absolute inset-0 m-auto inline-flex size-14 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur-sm">
          <PlayIcon className="ml-0.5 size-6" aria-hidden="true" />
        </span>
      </button>
    );
  }
  if (video.kind === "hosted") {
    return <video src={video.src} poster={video.poster.src} controls autoPlay playsInline preload="metadata" className="absolute inset-0 size-full object-cover" aria-label={video.title} />;
  }
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
      title={video.title}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      className="absolute inset-0 size-full"
    />
  );
}

type LightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: GalleryItem[];
  index: number;
  setIndex: (i: number) => void;
  productName: string;
};

/** Full-screen viewer. Click or double-tap toggles 2.5× zoom; scroll to pan. */
function Lightbox({ open, onOpenChange, items, index, setIndex, productName }: LightboxProps) {
  const [zoomed, setZoomed] = React.useState(false);
  const images = items.filter((i): i is Extract<GalleryItem, { kind: "image" }> => i.kind === "image");
  const current = images[Math.min(index, images.length - 1)];

  function step(delta: number) {
    setZoomed(false);
    setIndex((index + delta + images.length) % images.length);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  }

  if (!current) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setZoomed(false);
        onOpenChange(o);
      }}
    >
      <DialogContent className="h-dvh max-h-dvh w-screen max-w-none rounded-none border-0 p-0 sm:max-w-none" onKeyDown={onKeyDown}>
        <DialogTitle className="sr-only">{productName} images</DialogTitle>
        <DialogDescription className="sr-only">Use the arrow keys to move between images. Click an image to zoom.</DialogDescription>

        <div className={cn("relative size-full", zoomed ? "overflow-auto" : "overflow-hidden")}>
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
            aria-pressed={zoomed}
            className={cn("relative block outline-none", zoomed ? "h-[250%] w-[250%] cursor-zoom-out" : "size-full cursor-zoom-in")}
          >
            <Image src={current.image.src} alt={current.image.alt} fill sizes="100vw" unoptimized={current.image.unoptimized ?? false} className="object-contain" />
          </button>
        </div>

        {images.length > 1 ? (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="absolute top-1/2 left-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-brand">
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next image" className="absolute top-1/2 right-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-brand">
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs text-ink backdrop-blur-sm" aria-live="polite">
              {Math.min(index, images.length - 1) + 1} / {images.length}
            </p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
