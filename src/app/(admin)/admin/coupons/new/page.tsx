import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";

import { CouponForm } from "../_form";

export default async function NewCouponPage() {
  await requireAdmin("coupons:write");
  return (
    <div className="space-y-6">
      <PageHeader title="New coupon" back={{ href: "/admin/coupons/", label: "Coupons" }} description="Customers enter the code at checkout; every rule here is enforced on the server." />
      <CouponForm />
    </div>
  );
}
