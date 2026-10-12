import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { couponStatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { describeDiscount } from "@/modules/checkout/coupon-rules";
import { getCoupon } from "@/modules/coupons/admin";
import { formatPaise } from "@/lib/money";

import { deleteCouponAction, setCouponActiveAction } from "../_actions";
import { CouponForm } from "../_form";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; error?: string }> };

export default async function EditCouponPage({ params, searchParams }: Props) {
  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const session = await requireAdmin("coupons:read");
  const coupon = await getCoupon(id);
  if (!coupon) notFound();
  const canWrite = hasPermission(session.role, "coupons:write");

  return (
    <div className="space-y-6">
      <PageHeader
        title={coupon.code}
        description={`${describeDiscount(coupon)}${coupon.minOrderPaise > 0 ? ` · min order ${formatPaise(coupon.minOrderPaise)}` : ""} · used ${coupon.usageCount}${coupon.usageLimit ? ` of ${coupon.usageLimit}` : ""} times`}
        back={{ href: "/admin/coupons/", label: "Coupons" }}
        actions={
          <div className="flex items-center gap-2">
            {couponStatusBadge(coupon.status)}
            {canWrite ? (
              <form action={setCouponActiveAction.bind(null, coupon.id, !coupon.active)}>
                <button className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm text-ink hover:bg-surface-muted">{coupon.active ? "Deactivate" : "Activate"}</button>
              </form>
            ) : null}
          </div>
        }
      />

      {flags.created ? <p role="status" className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">Coupon created{coupon.active ? " and live" : " (inactive)"}.</p> : null}
      {flags.error ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{flags.error}</p> : null}

      {canWrite ? (
        <CouponForm coupon={coupon} />
      ) : (
        <p className="text-sm text-ink-muted">You can view this coupon but not change it.</p>
      )}

      {canWrite ? (
        <section className="max-w-xl space-y-3 rounded-md border border-danger/20 bg-surface p-5">
          <h2 className="text-sm font-medium text-danger">Delete</h2>
          <p className="text-xs text-ink-subtle">
            {coupon.usageCount > 0 ? "This code has been redeemed, so it stays on record for order history. Deactivate it to stop further use." : "This code has never been used and can be removed."}
          </p>
          {coupon.usageCount === 0 ? (
            <form action={deleteCouponAction.bind(null, coupon.id)}>
              <button className="rounded-md border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger hover:bg-danger/10">Delete {coupon.code}</button>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
