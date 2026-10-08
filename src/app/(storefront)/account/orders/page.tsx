import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AccountHeading, AccountNotConfigured } from "@/components/account/not-configured";
import { EmptyState } from "@/components/storefront/empty-state";
import { requireUser } from "@/lib/auth/guard";
import { formatPaise } from "@/lib/money";
import { getAccountService } from "@/modules/account/server";

import { orderStatusLabel } from "../page";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function OrdersPage() {
  const user = await requireUser("/account/orders/");
  const service = getAccountService();
  if (!service) return <AccountNotConfigured />;
  const orders = await service.orders.list(user.id, 50, user.emailConfirmed ? user.email : null);

  return (
    <>
      <AccountHeading title="Orders" />
      {!user.emailConfirmed ? (
        <EmptyState
          title="Confirm your email to see your orders"
          description={`We sent a confirmation link to ${user.email ?? "your email"}. Once it is confirmed, every order placed with that address appears here.`}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description={`Orders placed with ${user.email ?? "your email"} appear here.`}
          action={
            <Button asChild>
              <Link href="/collections/new-arrivals/">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.orderNumber}>
              <Link href={`/account/orders/${o.orderNumber}/`} className="flex items-center justify-between gap-4 py-4 hover:bg-surface-muted/50">
                <div>
                  <p className="text-sm font-medium text-ink">{o.orderNumber}</p>
                  <p className="type-small text-ink-muted">
                    {dateFormat.format(new Date(o.placedAt))} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · {orderStatusLabel(o.status)}
                  </p>
                </div>
                <span className="type-price shrink-0">{formatPaise(o.totalPaise)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
