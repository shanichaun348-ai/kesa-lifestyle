import * as React from "react";

import { cn } from "@/lib/utils";

type ShowcaseSectionProps = {
  id: string;
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/** Numbered section with an anchor so the page index can jump to it. */
export function ShowcaseSection({ id, number, title, description, children, className }: ShowcaseSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 border-t border-line py-12 lg:py-16", className)}>
      <div className="mb-8 flex flex-col gap-2">
        <p className="type-eyebrow text-ink-subtle">{String(number).padStart(2, "0")}</p>
        <h2 id={`${id}-title`} className="type-h2">
          {title}
        </h2>
        {description ? <p className="type-body max-w-prose text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Labelled example block inside a section. */
export function Example({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="type-small text-ink-subtle">{label}</p>
      <div className="rounded-md border border-line bg-surface p-5 sm:p-6">{children}</div>
    </div>
  );
}
