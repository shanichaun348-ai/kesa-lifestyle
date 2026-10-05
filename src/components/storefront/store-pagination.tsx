import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type StorePaginationProps = {
  currentPage: number;
  totalPages: number;
  /** Builds the href for a page. Page 1 must resolve to the base URL (docs/06 §1.2). */
  hrefFor: (page: number) => string;
  className?: string;
};

function pageWindow(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  let prev: number | undefined;
  for (const page of sorted) {
    if (prev !== undefined && page - prev > 1) out.push("ellipsis");
    out.push(page);
    prev = page;
  }
  return out;
}

/**
 * Real links on every page (crawlable), current page marked with aria-current.
 * Previous/next render as disabled text at the bounds rather than dead links.
 */
export function StorePagination({ currentPage, totalPages, hrefFor, className }: StorePaginationProps) {
  if (totalPages <= 1) return null;

  const bound = (label: string) => (
    <span aria-disabled="true" className="inline-flex h-11 items-center px-3 text-sm text-ink-subtle">
      {label}
    </span>
  );

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          {currentPage > 1 ? <PaginationPrevious href={hrefFor(currentPage - 1)} /> : bound("Previous")}
        </PaginationItem>

        {pageWindow(currentPage, totalPages).map((entry, i) =>
          entry === "ellipsis" ? (
            <PaginationItem key={`e-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={entry}>
              <PaginationLink href={hrefFor(entry)} isActive={entry === currentPage} aria-label={`Page ${entry}`}>
                {entry}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          {currentPage < totalPages ? <PaginationNext href={hrefFor(currentPage + 1)} /> : bound("Next")}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
