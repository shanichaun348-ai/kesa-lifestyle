import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("flex items-center gap-1", className)} {...props} />;
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
  isActive?: boolean;
  size?: React.ComponentProps<typeof Button>["size"];
};

/** Always a real anchor (crawlable). Active page gets aria-current. */
function PaginationLink({ className, isActive = false, size = "icon", href, ...props }: PaginationLinkProps) {
  return (
    <Button asChild variant={isActive ? "secondary" : "ghost"} size={size} className={cn("tabular-nums", className)}>
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        {...props}
      />
    </Button>
  );
}

function PaginationPrevious({ className, children = "Previous", ...props }: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="Go to previous page" size="md" className={cn("pl-3", className)} {...props}>
      <ChevronLeftIcon aria-hidden="true" />
      <span className="hidden sm:inline">{children}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, children = "Next", ...props }: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="Go to next page" size="md" className={cn("pr-3", className)} {...props}>
      <span className="hidden sm:inline">{children}</span>
      <ChevronRightIcon aria-hidden="true" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn("flex size-11 items-center justify-center text-ink-subtle [&_svg]:size-4", className)}
      {...props}
    >
      <MoreHorizontalIcon />
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
