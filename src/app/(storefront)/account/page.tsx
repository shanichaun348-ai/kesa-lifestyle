import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { requireUser } from "@/lib/auth/guard";
import { formatPaise } from "@/lib/money";
import { getAccountService } from "@/modules/account/server";
import type { AccountOrderStatus } from "@/modules/account/supabase-service";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

const STATUS_LABEL: Record<AccountOrderStatus, string> = {
  pending_payment: "Awaiting payment",
  failed: "Payment failed",
  paid: "Paid",
  processing: "Being packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function orderStatusLabel(status: AccountOrderStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export default async function AccountOverviewPage() {
  const user = await requireUser("/account/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const [profile, orders, addresses] = await Promise.all([
    service.profile.get(user.id, user.email),
    service.orders.list(user.id, 3, user.emailConfirmed ? user.email : null),
    service.addresses.list(user.id),
  ]);
  const defaultAddress = addresses.find((a) => a.isDefaultShipping) ?? addresses[0];

  return (
    <>
      <AccountHeading title={profile?.firstName ? `Hello, ${profile.firstName}` : "Hello"} intro={user.email ?? undefined} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent>
            {!user.emailConfirmed ? (
              <p className="type-small text-ink-muted">Confirm your email ({user.email}) using the link we sent you, and your orders will appear here.</p>
            ) : orders.length === 0 ? (
              <p className="type-small text-ink-muted">No orders yet. Orders placed with {user.email} appear here.</p>
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
            <CardTitle>Delivery address</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-ink-muted">
            {defaultAddress ? (
              <>
                <p className="text-ink">{defaultAddress.fullName}</p>
                <p>
                  {defaultAddress.line1}
                  {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}
                </p>
                <p>
                  {defaultAddress.city}, {defaultAddress.state} {defaultAddress.pincode}
                </p>
              </>
            ) : (
              <p>Save an address to speed up checkout.</p>
            )}
            <Button variant="link" className="self-start" asChild>
              <Link href="/account/addresses/">Manage addresses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
