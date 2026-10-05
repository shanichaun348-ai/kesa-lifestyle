import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { requireUser } from "@/lib/auth/guard";
import { formatPaise } from "@/lib/money";
import { getAccountService } from "@/modules/account/server";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  payment_failed: "Payment failed",
  cod_pending: "Confirming",
  paid: "Paid",
  confirmed: "Confirmed",
  processing: "Being packed",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  rto: "Returned to us",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export default async function AccountOverviewPage() {
  const user = await requireUser("/account/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const [profile, orders, loyalty] = await Promise.all([service.profile.get(user.id), service.orders.list(user.id, 3), service.loyalty.summary(user.id)]);

  return (
    <>
      <AccountHeading title={profile?.firstName ? `Hello, ${profile.firstName}` : "Hello"} intro={user.email ?? undefined} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="type-small text-ink-muted">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {orders.map((o) => (
                  <li key={o.orderNumber} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <Link href={`/account/orders/${o.orderNumber}/`} className="text-ink underline-offset-4 hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="type-small text-ink-muted">{orderStatusLabel(o.status)}</p>
                    </div>
                    <span className="type-price">{formatPaise(o.totalPaise)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="link" className="mt-2" asChild>
              <Link href="/account/orders/">All orders</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rewards</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-ink-muted">
            <p>
              <span className="type-h3 text-ink">{loyalty.balancePoints}</span> points · {loyalty.tier} tier
            </p>
            <p>Earning and redeeming open with the loyalty launch; your balance is tracked from day one.</p>
            <Button variant="link" className="self-start" asChild>
              <Link href="/account/rewards/">Rewards and referrals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
