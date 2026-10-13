import Image from "next/image";

import type { ImageRef } from "@/modules/catalog/types";

/**
 * Immersive backdrop for the dark theme: the product's own photo, blurred and
 * darkened behind the page so the stage feels lit from the piece itself.
 * Hidden in the light theme, decorative only, and loaded lazily so it never
 * competes with the gallery for LCP. Render only with a real photograph.
 */
export function ProductBackdrop({ image }: { image: ImageRef }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden dark:block">
      <Image
        src={image.src}
        alt=""
        fill
        sizes="100vw"
        quality={75}
        loading="lazy"
        fetchPriority="low"
        unoptimized={image.unoptimized ?? false}
        className="scale-125 object-cover opacity-55 blur-3xl"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_35%,transparent_0%,var(--color-bg)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}
