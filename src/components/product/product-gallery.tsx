"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tilt } from "@/components/motion/tilt";
import { useFinePointer, useZoomTracking, ZoomStage, zoomSource } from "@/components/product/zoom-stage";
import type { ImageRef, ProductVideo } from "@/modules/catalog/types";
import { cn } from "@/lib/utils";

export type GalleryItem = { kind: "image"; image: ImageRef } | { kind: "video"; video: ProductVideo };

type ProductGalleryProps = {
  productName: string;
  items: GalleryItem[];
};

const STAGE_SIZES = "(min-width: 1024px) 50vw, 100vw";

/**
 * Gallery: snap-scrolling stage with a thumbnail row under it on phones and
 * a thumbnail column beside it on desktop, and a lightbox with zoom. Only the first image is eager (LCP);
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
    <div className="flex flex-col lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-4">
      {/* Thumbnails: a scrollable row under the stage on phones, a column beside it on desktop. */}
      {items.length > 1 ? (
      <ul className="no-scrollbar order-2 mt-3 flex gap-2 overflow-x-auto px-0.5 py-1 lg:order-none lg:mt-0 lg:flex-col lg:overflow-visible lg:py-0.5" aria-label="Choose image">
        {items.map((item, i) => (
          <li
            key={i}
            ref={(el) => {
              // Keep the active thumbnail in view as the stage is swiped.
              if (el && active === i) el.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            className="w-16 shrink-0 lg:w-auto"
          >
            <button
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={item.kind === "video" ? `Play video: ${item.video.title}` : `Show image ${i + 1}`}
              aria-current={active === i ? "true" : undefined}
              className={cn(
                "relative block aspect-[3/4] w-full overflow-hidden rounded-md border bg-surface-muted",
                "transition-[transform,box-shadow,border-color] duration-250 ease-(--ease-standard) motion-safe:hover:-translate-y-0.5",
                active === i
                  ? "border-highlight ring-1 ring-highlight shadow-(--shadow-float)"
                  : "border-line hover:border-highlight/60",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              )}
            >
              <Image src={posterOf(item).src} alt="" fill sizes="72px" unoptimized={posterOf(item).unoptimized ?? false} className="object-cover" />
              {item.kind === "video" ? <PlayIcon className="absolute inset-0 m-auto size-5 text-on-image drop-shadow" aria-hidden="true" /> : null}
            </button>
          </li>
        ))}
      </ul>
      ) : null}

      {/* Stage: a hairline gold frame with a soft top-light; tilts a few degrees toward a mouse pointer. */}
      <Tilt max={4} glare={false} className="relative">
        <ul
          ref={stageRef}
          onScroll={onStageScroll}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto lg:mx-0 lg:overflow-hidden"
          aria-label={`${productName} images`}
        >
          {items.map((item, i) => (
            <li key={i} className="w-full shrink-0 snap-center px-4 lg:px-0">
              <figure
                className={cn(
                  "lux-frame lux-stage-light relative aspect-[4/5] overflow-hidden rounded-md bg-surface-muted",
                  "transition-[opacity,transform] duration-500 ease-(--ease-standard)",
                  active === i ? "opacity-100" : "lg:scale-[0.985] lg:opacity-60",
                )}
              >
                {item.kind === "image" ? (
                  <ZoomStage
                    image={item.image}
                    priority={i === 0}
                    sizes={STAGE_SIZES}
                    label={`Open image ${i + 1} of ${items.length} full screen`}
                    onOpen={() => {
                      setActive(i);
                      setOpen(true);
                    }}
                  />
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
      </Tilt>

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
        <span className="lux-hairline absolute inset-0 m-auto inline-flex size-14 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur-sm dark:text-highlight">
          <PlayIcon className="ml-0.5 size-6" aria-hidden="true" />
        </span>
      </button>
    );
  }
  if (video.kind === "hosted") {
    // Landscape clips sit letterboxed on a dark field inside the 4:5 frame rather than being cropped.
    return <video src={video.src} poster={video.poster.src} controls autoPlay playsInline preload="metadata" className="absolute inset-0 size-full bg-ink object-contain" aria-label={video.title} />;
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

/**
 * Full-screen viewer. Click toggles 2.5× zoom: with a mouse the magnified
 * area follows the cursor; on touch the image becomes a pannable 250% canvas.
 */
function Lightbox({ open, onOpenChange, items, index, setIndex, productName }: LightboxProps) {
  const [zoomed, setZoomed] = React.useState(false);
  const fine = useFinePointer();
  const { ref: zoomRef, handlers: zoomHandlers } = useZoomTracking<HTMLDivElement>(fine && zoomed);
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

        {fine ? (
          <div ref={zoomRef} className="group/lb relative size-full overflow-hidden" {...zoomHandlers}>
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
              aria-pressed={zoomed}
              className={cn("relative block size-full outline-none", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
            >
              <Image src={current.image.src} alt={current.image.alt} fill sizes="100vw" unoptimized={current.image.unoptimized ?? false} className="object-contain" />
              {zoomed ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-surface bg-no-repeat opacity-0 transition-opacity duration-150 group-data-[active=true]/lb:opacity-100"
                  style={{ backgroundImage: `url("${zoomSource(current.image)}")`, backgroundSize: "250%", backgroundPosition: "var(--zx, 50%) var(--zy, 50%)" }}
                />
              ) : null}
            </button>
          </div>
        ) : (
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
        )}

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
