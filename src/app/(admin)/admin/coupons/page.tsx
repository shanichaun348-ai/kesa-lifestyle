import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { couponStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { seedCoupons } from "@/lib/demo/seed-coupons";
import { formatPaise } from "@/lib/money";

export default async function CouponsPage() {
  const session = await requireAdmin("coupons:read");
  const canWrite = hasPermission(session.role, "coupons:write");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description={`${seedCoupons.length} discount codes`}
        actions={
          canWrite ? (
            <Link href="/admin/coupons/new/" className="inline-flex h-9 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
              + Create coupon
            </Link>
          ) : undefined
        }
      />

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Code</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Value</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Usage</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Expires</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
              {canWrite ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {seedCoupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <p className="font-mono font-medium text-ink">{coupon.code}</p>
                  <p className="text-xs text-ink-subtle">{coupon.description.slice(0, 50)}</p>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="font-medium text-ink">
                    {coupon.type === "percent" ? `${coupon.value}%` : formatPaise(coupon.value)}
                  </span>
                  {coupon.minOrderPaise > 0 ? (
                    <span className="ml-1 text-xs text-ink-subtle">min {formatPaise(coupon.minOrderPaise)}</span>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                  {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                </td>
                <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">
                  {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("en-IN") : "Never"}
                </td>
                <td className="px-4 py-3">{couponStatusBadge(coupon.status)}</td>
                {canWrite ? (
                  <td className="px-4 py-3 text-right">
                    <button className="text-sm text-brand hover:underline">Edit</button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
