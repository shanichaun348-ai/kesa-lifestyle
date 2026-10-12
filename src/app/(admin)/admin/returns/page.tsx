import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { formatOrderNumber, listOrders } from "@/modules/admin/orders-data";
import { countOpenReturns, listReturnRequests, type ReturnTab } from "@/modules/returns/supabase-returns";
import { kindLabel, RETURN_STATUS_LABEL, type ReturnStatus } from "@/modules/returns/types";

const TABS: Array<{ label: string; value: ReturnTab }> = [
  { label: "Open", value: "open" },
  { label: "Approved", value: "approved" },
  { label: "Received", value: "received" },
  { label: "Closed", value: "closed" },
];

const BADGE: Record<ReturnStatus, "warning" | "info" | "success" | "danger" | "neutral"> = {
  requested: "warning",
  approved: "info",
  received: "info",
  refunded: "success",
  exchanged: "success",
  rejected: "danger",
  cancelled: "neutral",
};

type Props = { searchParams: Promise<{ tab?: string }> };

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

function age(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

export default async function ReturnsPage({ searchParams }: Props) {
  const [, { tab }] = await Promise.all([requireAdmin("orders:read"), searchParams]);
  const active: ReturnTab = TABS.find((t) => t.value === tab)?.value ?? "open";
  const [requests, open, orders] = await Promise.all([listReturnRequests(active), countOpenReturns(), listOrders()]);
  const orderById = new Map(orders.map((o) => [o.id, o]));

  return (
    <div className="space-y-6">
      <PageHeader title="Returns & exchanges" description={open > 0 ? `${open} waiting for a decision` : "Nothing waiting — all caught up"} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.value} href={`/admin/returns/?tab=${t.value}`} className={`rounded-sm border px-3 py-1.5 text-sm ${t.value === active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-muted hover:border-ink-muted"}`}>
            {t.label}
            {t.value === "open" && open > 0 ? <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 text-xs text-warning">{open}</span> : null}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        {requests.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">No {active} requests.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Order</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Request</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Items</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Age</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((r) => {
                const order = orderById.get(r.orderId);
                return (
                  <tr key={r.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      {order ? (
                        <Link href={`/admin/orders/${order.id}/`} className="font-medium text-brand hover:underline">
                          {formatOrderNumber(order.orderNumber)}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-ink-muted">{r.orderId}</span>
                      )}
                      <p className="text-xs text-ink-subtle">{dateFormat.format(new Date(r.createdAt))}</p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <p className="text-ink">{order?.customer.name ?? "—"}</p>
                      <p className="text-xs text-ink-subtle">{r.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-ink">{kindLabel(r.kind)}</td>
                    <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">
                      {r.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{age(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={RETURN_STATUS_LABEL[r.status]} variant={BADGE[r.status]} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/returns/${r.id}/`} className="text-sm text-brand hover:underline">
                        View
                      </Link>
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
