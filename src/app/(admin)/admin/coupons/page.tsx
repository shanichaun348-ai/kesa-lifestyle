import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { couponStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { describeDiscount } from "@/modules/checkout/coupon-rules";
import { listCoupons } from "@/modules/coupons/admin";
import { isSupabaseConfigured } from "@/lib/supabase";
import { formatPaise } from "@/lib/money";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function CouponsPage() {
  const session = await requireAdmin("coupons:read");
  const canWrite = hasPermission(session.role, "coupons:write");
  const coupons = isSupabaseConfigured() ? await listCoupons() : [];
  const live = coupons.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description={`${live} live · ${coupons.length} total`}
        actions={
          canWrite ? (
            <Link href="/admin/coupons/new/" className="inline-flex h-9 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
              + Create coupon
            </Link>
          ) : undefined
        }
      />

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        {coupons.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">
            No coupons yet. Create one, then show it on the site under Content → Announcement bar.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Code</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle sm:table-cell">Discount</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle md:table-cell">Used</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle lg:table-cell">Valid</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-ink">{c.code}</p>
                    {c.description ? <p className="text-xs text-ink-subtle">{c.description}</p> : null}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-medium text-ink">{describeDiscount(c)}</span>
                    {c.minOrderPaise > 0 ? <span className="ml-1 text-xs text-ink-subtle">min {formatPaise(c.minOrderPaise)}</span> : null}
                    {c.firstOrderOnly ? <span className="ml-1 text-xs text-ink-subtle">· first order</span> : null}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                    {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                    {c.perCustomerLimit ? <span className="block text-xs text-ink-subtle">{c.perCustomerLimit} per customer</span> : null}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">
                    {c.startsAt ? `${dateFormat.format(new Date(c.startsAt))} – ` : ""}
                    {c.endsAt ? dateFormat.format(new Date(c.endsAt)) : "No end date"}
                  </td>
                  <td className="px-4 py-3">{couponStatusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/coupons/${c.id}/`} className="text-sm text-brand hover:underline">{canWrite ? "Edit" : "View"}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
