import Link from "next/link";
import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Storefront breadcrumbs. The last item is the current page.
 * JSON-LD `BreadcrumbList` is emitted separately by the SEO module.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="gap-1 text-xs text-ink-muted sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem className={cn(isLast && "min-w-0")}>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="truncate text-ink">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="hover:text-ink">
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? (
                <BreadcrumbSeparator className="text-ink-subtle">
                  <span aria-hidden="true">›</span>
                </BreadcrumbSeparator>
              ) : null}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
