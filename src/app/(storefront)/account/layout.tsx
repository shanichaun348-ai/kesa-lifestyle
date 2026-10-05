import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/storefront/container";
import { logoutAction } from "@/modules/auth/actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/account/", label: "Overview" },
  { href: "/account/orders/", label: "Orders" },
  { href: "/account/addresses/", label: "Addresses" },
  { href: "/account/wishlist/", label: "Wishlist" },
  { href: "/account/reviews/", label: "Reviews" },
  { href: "/account/rewards/", label: "Rewards" },
  { href: "/account/preferences/", label: "Email preferences" },
  { href: "/account/profile/", label: "Profile" },
];

/**
 * Account shell. Pages call `requireUser()` themselves, so this layout stays
 * free of data access; the reset-password page is reachable without a
 * completed session for the recovery flow.
 */
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <Container className="pt-6 pb-16 lg:pb-24">
      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <aside className="mb-8 lg:mb-0">
          <nav aria-label="Account">
            <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
              {NAV.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link href={item.href} className="inline-flex h-10 items-center rounded-sm px-3 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink lg:w-full">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form action={logoutAction} className="mt-4 hidden lg:block">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
      <form action={logoutAction} className="mt-10 lg:hidden">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </Container>
  );
}
