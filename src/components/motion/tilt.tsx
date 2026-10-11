"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Pointer-driven depth effects. Both components write CSS custom properties
 * straight onto the element (no React state per move) and switch themselves
 * on only for hover-capable, fine-pointer devices without reduced motion —
 * phones and keyboard users get the plain layout.
 */

function usePointerField<T extends HTMLElement>(maxTilt: number) {
  const ref = React.useRef<T>(null);
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<T>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.style.setProperty("--rx", `${(-py * maxTilt).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * maxTilt).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
      el.dataset.active = "true";
    },
    [maxTilt],
  );

  const onPointerLeave = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    for (const v of ["--px", "--py", "--rx", "--ry"]) el.style.removeProperty(v);
    delete el.dataset.active;
  }, []);

  return { ref, enabled, handlers: enabled ? { onPointerMove, onPointerLeave } : {} };
}

type TiltProps = {
  as?: "div" | "span";
  className?: string;
  /** Maximum rotation in degrees at the edges (default 7). */
  max?: number;
  /** Show the moving light reflection (default true). */
  glare?: boolean;
  children: React.ReactNode;
};

/** 3D card tilt that follows the cursor, with a soft light reflection. */
export function Tilt({ as: Tag = "div", className, max = 7, glare = true, children }: TiltProps) {
  const { ref, enabled, handlers } = usePointerField<HTMLDivElement>(max);
  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={cn(enabled && "tilt-3d", Tag === "span" && "block", className)} {...handlers}>
      {children}
      {enabled && glare ? <span aria-hidden="true" className="tilt-glare pointer-events-none absolute inset-0 z-[5]" /> : null}
    </Tag>
  );
}

type ParallaxProps = { className?: string; children: React.ReactNode };

/** Sets --px/--py on itself; descendants with `.parallax-layer` drift against the cursor. */
export function Parallax({ className, children }: ParallaxProps) {
  const { ref, handlers } = usePointerField<HTMLDivElement>(0);
  return (
    <div ref={ref} className={className} {...handlers}>
      {children}
    </div>
  );
}
