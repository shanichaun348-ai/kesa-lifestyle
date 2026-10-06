import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearchIcon } from "lucide-react";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/storefront/container";

export const metadata: Metadata = {
  title: "Track your order",
  robots: { index: false },
};

export default function TrackOrderPage() {
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Track order" }]} />
      <div className="mx-auto mt-12 max-w-md text-center space-y-6">
        <PackageSearchIcon className="mx-auto size-12 text-ink-muted" strokeWidth={1.5} />
        <div className="space-y-2">
          <h1 className="type-h2">Track your order</h1>
          <p className="text-ink-muted text-sm">
            Order tracking is coming soon. For now, you can check your order status by emailing us with your order number.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button variant="primary" asChild>
            <a href="mailto:hello@kesalifestyle.com?subject=Order%20Tracking">
              Email us
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/account/orders/">My orders</Link>
          </Button>
        </div>
        <p className="text-xs text-ink-subtle">
          Include your order number (e.g. KL-1001) in the subject line.
        </p>
      </div>
    </Container>
  );
}
