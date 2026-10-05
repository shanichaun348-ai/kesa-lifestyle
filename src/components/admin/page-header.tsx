import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

export function PageHeader({ title, description, actions, back, className }: Props) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {back ? (
          <a href={back.href} className="mb-1 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
            <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8l4-4" />
            </svg>
            {back.label}
          </a>
        ) : null}
        <h1 className="text-xl font-medium text-ink">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
