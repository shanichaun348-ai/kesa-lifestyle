"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { productStatusBadge } from "@/components/admin/status-badge";

import { bulkProductAction, type BulkAction, type BulkResult } from "./_bulk-actions";

export type ProductRow = {
  slug: string;
  name: string;
  thumb: string | null;
  /** Variant SKUs in position order; the first is the main one. */
  skus: string[];
  category: string;
  /** Other categories the product is also listed under. */
  extraCategories: string[];
  /** Homepage spots it is pinned to, e.g. "Shop the look". */
  placements: string[];
  priceLabel: string;
  stock: number;
  status: "active" | "draft" | "archived";
};

type Props = {
  rows: ProductRow[];
  canWrite: boolean;
  canDelete: boolean;
};

const CHECKBOX = "size-4 shrink-0 cursor-pointer rounded-[3px] border-line-strong bg-surface accent-brand";
const TOOL_BUTTON = "inline-flex h-8 items-center rounded-sm border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function describe(action: BulkAction, result: BulkResult): string {
  const verb = { publish: "published", unpublish: "moved to draft", archive: "archived", restore: "restored to draft", delete: "deleted" }[action];
  const parts = [`${result.done.length} ${verb}`];
  if (result.skipped.length > 0) {
    const reasons = new Map<string, number>();
    for (const s of result.skipped) reasons.set(s.reason, (reasons.get(s.reason) ?? 0) + 1);
    parts.push(`${result.skipped.length} skipped (${[...reasons].map(([r, n]) => `${n} ${r}`).join(", ")})`);
  }
  return parts.join(" · ") + ".";
}

/**
 * Product list with row selection. Pick rows, then publish, unpublish,
 * archive, restore or delete them together. Delete asks for a second click
 * inline rather than opening a browser dialog.
 */
export function ProductTable({ rows, canWrite, canDelete }: Props) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const headerRef = React.useRef<HTMLInputElement>(null);

  // Drop selections for rows that disappeared after a refresh (e.g. deleted or filtered out).
  const visible = React.useMemo(() => new Set(rows.map((r) => r.slug)), [rows]);
  const chosen = React.useMemo(() => [...selected].filter((s) => visible.has(s)), [selected, visible]);
  const allChosen = rows.length > 0 && chosen.length === rows.length;

  React.useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = chosen.length > 0 && !allChosen;
  }, [chosen.length, allChosen]);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    setConfirmDelete(false);
  }

  function toggleAll() {
    setSelected(allChosen ? new Set() : new Set(rows.map((r) => r.slug)));
    setConfirmDelete(false);
  }

  function run(action: BulkAction) {
    if (action === "delete" && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const slugs = chosen;
    setConfirmDelete(false);
    setMessage(null);
    startTransition(async () => {
      const result = await bulkProductAction(action, slugs);
      if (result.error) setMessage({ kind: "error", text: result.done.length > 0 ? `${describe(action, result)} ${result.error}` : result.error });
      else setMessage({ kind: "ok", text: describe(action, result) });
      setSelected(new Set(result.skipped.map((s) => s.slug)));
      router.refresh();
    });
  }

  const statuses = new Set(rows.filter((r) => chosen.includes(r.slug)).map((r) => r.status));
  const canPublish = chosen.length > 0 && (statuses.has("draft") || statuses.has("archived"));
  const canUnpublish = chosen.length > 0 && statuses.has("active");
  const canArchive = chosen.length > 0 && (statuses.has("active") || statuses.has("draft"));
  const canRestore = chosen.length > 0 && statuses.has("archived");

  return (
    <div className="space-y-3">
      {canWrite ? (
        <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-3 py-2" aria-live="polite">
          <span className="mr-2 text-xs text-ink-muted">{chosen.length === 0 ? "Select products to act on them together." : `${chosen.length} selected`}</span>
          <button type="button" onClick={() => run("publish")} disabled={pending || !canPublish} className={`${TOOL_BUTTON} border-success/40 bg-success/10 text-success hover:bg-success hover:text-bg`}>
            Publish
          </button>
          <button type="button" onClick={() => run("unpublish")} disabled={pending || !canUnpublish} className={`${TOOL_BUTTON} border-line text-ink hover:bg-surface-muted`}>
            Unpublish
          </button>
          <button type="button" onClick={() => run("archive")} disabled={pending || !canArchive} className={`${TOOL_BUTTON} border-warning/40 bg-warning/5 text-warning hover:bg-warning/10`}>
            Archive
          </button>
          <button type="button" onClick={() => run("restore")} disabled={pending || !canRestore} className={`${TOOL_BUTTON} border-line text-ink hover:bg-surface-muted`}>
            Restore
          </button>
          {canDelete ? (
            <span className="ml-auto flex items-center gap-2">
              {confirmDelete ? <span className="text-xs text-danger">Delete {chosen.length} permanently? This cannot be undone.</span> : null}
              <button type="button" onClick={() => run("delete")} disabled={pending || chosen.length === 0} className={`${TOOL_BUTTON} border-danger/40 bg-danger/5 text-danger hover:bg-danger hover:text-bg`}>
                {confirmDelete ? "Yes, delete" : "Delete"}
              </button>
              {confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(false)} className={`${TOOL_BUTTON} border-line text-ink hover:bg-surface-muted`}>
                  Cancel
                </button>
              ) : null}
            </span>
          ) : null}
          {pending ? <span className="text-xs text-ink-subtle">Working…</span> : null}
        </div>
      ) : null}

      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-2 text-sm ${message.kind === "error" ? "border-danger/30 bg-danger/5 text-danger" : "border-success/30 bg-success/5 text-success"}`}>
          {message.text}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">No products here.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                {canWrite ? (
                  <th className="w-10 px-4 py-3">
                    <input ref={headerRef} type="checkbox" className={CHECKBOX} checked={allChosen} onChange={toggleAll} aria-label="Select all products on this page" />
                  </th>
                ) : null}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Product</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">SKU</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Category</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Price</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((product) => {
                const isChosen = chosen.includes(product.slug);
                return (
                  <tr key={product.slug} className={isChosen ? "bg-brand/5" : "hover:bg-surface-muted/50"}>
                    {canWrite ? (
                      <td className="px-4 py-3">
                        <input type="checkbox" className={CHECKBOX} checked={isChosen} onChange={() => toggle(product.slug)} aria-label={`Select ${product.name}`} />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-muted">
                          {product.thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.thumb} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-[10px] text-warning" title="No photo">No photo</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{product.name}</p>
                          <p className="truncate text-xs text-ink-subtle">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {product.skus.length === 0 ? (
                        <span className="text-xs text-warning">No SKU</span>
                      ) : (
                        <>
                          <span className="block font-mono text-xs text-ink">{product.skus[0]}</span>
                          {product.skus.length > 1 ? (
                            <span className="block text-xs text-ink-subtle" title={product.skus.slice(1).join(", ")}>+ {product.skus.length - 1} more</span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                      <span className="block">{product.category}</span>
                      {product.extraCategories.length > 0 ? <span className="block text-xs text-ink-subtle">+ {product.extraCategories.join(", ")}</span> : null}
                      {product.placements.length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {product.placements.map((label) => (
                            <span key={label} className="rounded-sm border border-brand/30 bg-brand/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand">Home · {label}</span>
                          ))}
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 font-medium text-ink sm:table-cell">{product.priceLabel}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className={product.stock === 0 ? "text-danger" : product.stock <= 5 ? "text-warning" : "text-ink-muted"}>{product.stock} units</span>
                    </td>
                    <td className="px-4 py-3">{productStatusBadge(product.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/products/${product.slug}/`} className="text-sm text-brand hover:underline">{canWrite ? "Edit" : "View"}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
