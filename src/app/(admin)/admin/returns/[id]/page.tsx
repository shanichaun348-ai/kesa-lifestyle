import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { formatOrderNumber, getOrder } from "@/modules/admin/orders-data";
import { hasPermission } from "@/modules/admin/rbac";
import { getReturnRequest } from "@/modules/returns/supabase-returns";
import { kindLabel, RETURN_REASONS, RETURN_STATUS_LABEL } from "@/modules/returns/types";
import { formatPaise } from "@/lib/money";

import { ReturnActions } from "../_actions-ui";

type Props = { params: Promise<{ id: string }> };

const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function ReturnDetailPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, requireAdmin("orders:read")]);
  const request = await getReturnRequest(id);
  if (!request) notFound();
  const order = await getOrder(request.orderId);

  const lineTotal = (sku: string, qty: number) => {
    const item = order?.items.find((i) => i.sku === sku);
    return item ? item.unitPricePaise * qty : 0;
  };
  const suggested = request.items.reduce((s, i) => s + lineTotal(i.sku, i.quantity), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${kindLabel(request.kind)} request`}
        description={order ? `Order ${formatOrderNumber(order.orderNumber)} · ${dateTime.format(new Date(request.createdAt))}` : dateTime.format(new Date(request.createdAt))}
        back={{ href: "/admin/returns/", label: "Returns" }}
        actions={<StatusBadge label={RETURN_STATUS_LABEL[request.status]} variant={request.status === "requested" ? "warning" : request.status === "rejected" ? "danger" : request.status === "refunded" || request.status === "exchanged" ? "success" : "info"} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-medium text-ink">Pieces in this request</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Product</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-subtle">Reason</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-subtle">Qty</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-subtle">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {request.items.map((i) => (
                  <tr key={i.sku}>
                    <td className="py-3">
                      <p className="font-medium text-ink">{i.productName}</p>
                      <p className="font-mono text-xs text-ink-subtle">{i.sku}</p>
                    </td>
                    <td className="py-3 text-ink-muted">{RETURN_REASONS[i.reason]}</td>
                    <td className="py-3 text-right text-ink-muted">{i.quantity}</td>
                    <td className="py-3 text-right font-medium text-ink">{formatPaise(lineTotal(i.sku, i.quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {request.details ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-1 text-xs text-ink-subtle">From the customer</p>
                <p className="whitespace-pre-line text-sm text-ink-muted">{request.details}</p>
              </div>
            ) : null}
            {request.photos.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {request.photos.map((p, i) => (
                  <li key={i}>
                    <a href={p.src} target="_blank" rel="noopener noreferrer" className="block size-24 overflow-hidden rounded-sm border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt="" className="size-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {request.adminNote ? (
            <section className="rounded-md border border-line bg-surface p-5">
              <h2 className="mb-1 text-sm font-medium text-ink">Last message to the customer</h2>
              <p className="whitespace-pre-line text-sm text-ink-muted">{request.adminNote}</p>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="space-y-2 rounded-md border border-line bg-surface p-5 text-sm">
            <h2 className="text-sm font-medium text-ink">Order</h2>
            {order ? (
              <>
                <Link href={`/admin/orders/${order.id}/`} className="font-medium text-brand hover:underline">
                  {formatOrderNumber(order.orderNumber)}
                </Link>
                <p className="text-ink">{order.customer.name}</p>
                <p className="text-ink-muted">{order.customer.email}</p>
                <p className="text-ink-muted">{order.customer.phone}</p>
                <p className="text-xs text-ink-subtle">
                  {order.paymentMethod === "cod" ? "Paid in cash on delivery" : "Paid online via Razorpay"} · delivered {order.deliveredAt ? dateTime.format(new Date(order.deliveredAt)) : "—"}
                </p>
                {request.refundPaise !== null ? <p className="text-xs text-ink-subtle">Refunded {formatPaise(request.refundPaise)}</p> : null}
              </>
            ) : (
              <p className="text-ink-muted">Order not found.</p>
            )}
          </section>

          <ReturnActions
            id={request.id}
            orderId={request.orderId}
            status={request.status}
            kind={request.kind}
            canRefund={hasPermission(session.role, "orders:refund")}
            internalNote={request.internalNote}
            suggestedRefundRupees={(suggested / 100).toFixed(2).replace(/\.00$/, "")}
          />
        </div>
      </div>
    </div>
  );
}
