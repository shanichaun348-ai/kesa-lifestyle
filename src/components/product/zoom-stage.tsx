"use client";

import * as React from "react";
import Image from "next/image";
import { ZoomInIcon } from "lucide-react";

import type { ImageRef } from "@/modules/catalog/types";
import { cn } from "@/lib/utils";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True on devices with a mouse or trackpad — the only place hover zoom makes sense. */
export function useFinePointer(): boolean {
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(FINE_POINTER).matches, () => false);
}

/**
 * Tracks the pointer over `ref` and writes --zx/--zy (percentages) plus
 * data-active onto it, so a child with `background-position: var(--zx) var(--zy)`
 * shows the magnified region under the cursor. No React state per move.
 */
export function useZoomTracking<T extends HTMLElement>(enabled: boolean) {
  const ref = React.useRef<T>(null);
  const onPointerMove = React.useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--zx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`);
    el.style.setProperty("--zy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`);
    el.dataset.active = "true";
  }, []);
  const onPointerLeave = React.useCallback(() => {
    const el = ref.current;
    if (el) delete el.dataset.active;
  }, []);
  return { ref, handlers: enabled ? { onPointerMove, onPointerLeave } : {} };
}

/** A large rendition for the magnified layer: through the image optimiser unless the source is a local placeholder. */
export function zoomSource(image: ImageRef): string {
  if (image.unoptimized) return image.src;
  // Trailing slash and q=75 match what next/image itself emits: the optimiser
  // rejects any width or quality outside its configured set with a 400.
  return `/_next/image/?url=${encodeURIComponent(image.src)}&w=1440&q=75`;
}

type ZoomStageProps = {
  image: ImageRef;
  priority: boolean;
  sizes: string;
  label: string;
  onOpen: () => void;
  /** Magnification of the hover layer (default 2.4×). */
  scale?: number;
};

/** Gallery stage image with hover-to-magnify and click-to-open. */
export function ZoomStage({ image, priority, sizes, label, onOpen, scale = 2.4 }: ZoomStageProps) {
  const fine = useFinePointer();
  const { ref, handlers } = useZoomTracking<HTMLDivElement>(fine);

  return (
    <div ref={ref} className="group/zoom absolute inset-0" {...handlers}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        sizes={sizes}
        unoptimized={image.unoptimized ?? false}
        className="object-cover"
      />
      {fine ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-no-repeat opacity-0 transition-opacity duration-200 group-data-[active=true]/zoom:opacity-100"
          style={{ backgroundImage: `url("${zoomSource(image)}")`, backgroundSize: `${scale * 100}%`, backgroundPosition: "var(--zx, 50%) var(--zy, 50%)" }}
        />
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className={cn("absolute inset-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand", fine ? "cursor-crosshair" : "cursor-zoom-in")}
      >
        <span className="absolute right-3 bottom-3 inline-flex size-9 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur-sm transition-opacity group-data-[active=true]/zoom:opacity-0">
          <ZoomInIcon className="size-4" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
