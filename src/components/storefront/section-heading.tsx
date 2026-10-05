import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/** Eyebrow + serif title + optional description and "View all" link. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex max-w-prose flex-col gap-2">
        {eyebrow ? <p className="type-eyebrow text-ink-subtle">{eyebrow}</p> : null}
        <Heading className={Heading === "h1" ? "type-h1" : "type-h2"}>{title}</Heading>
        {description ? <p className="type-body text-ink-muted">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="type-small shrink-0 font-medium text-ink underline decoration-line-strong underline-offset-6 hover:decoration-ink"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
