import Image from "next/image";
import Link from "next/link";
import { SearchIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { Logo } from "@/components/storefront/logo";
import { MobileNav } from "@/components/storefront/mobile-nav";
import { WishlistLink } from "@/components/storefront/wishlist-link";
import type { NavLink, NavMenu } from "@/lib/navigation";

type SiteHeaderProps = {
  menus: NavMenu[];
  secondaryLinks: NavLink[];
};

/**
 * Sticky header. Desktop mega-menu is CSS-only (hover + focus-within), so it
 * ships zero JavaScript; the mobile sheet and bag drawer are client islands.
 */
export function SiteHeader({ menus, secondaryLinks }: SiteHeaderProps) {
  return (
    <header className="header-shrink sticky top-0 z-40 bg-bg/95 shadow-(--shadow-header) backdrop-blur supports-backdrop-filter:bg-bg/85 [--header-h:4.5rem]">
      <div className="container-page flex h-14 items-center gap-2 transition-[height] duration-150 lg:h-(--header-h)">
        <MobileNav menus={menus} secondaryLinks={secondaryLinks} />

        <Logo className="lg:mr-8" />

        <nav aria-label="Primary" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-7">
            {menus.map((menu) => (
              <li key={menu.href} className="group/menu">
                <Link
                  href={menu.href}
                  className="relative flex h-(--header-h) items-center text-sm font-medium text-ink after:absolute after:inset-x-0 after:bottom-4 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-250 after:ease-(--ease-standard) group-hover/menu:after:scale-x-100 group-focus-within/menu:after:scale-x-100"
                  aria-haspopup={menu.columns ? "true" : undefined}
                >
                  {menu.label}
                </Link>

                {menu.columns ? (
                  <div
                    className="invisible absolute inset-x-0 top-full border-t border-line bg-bg opacity-0 shadow-(--shadow-float) transition-[opacity,visibility] duration-250 ease-(--ease-standard) group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100"
                  >
                    <div className="container-page grid grid-cols-[repeat(3,minmax(0,12rem))_1fr] gap-10 py-10">
                      {menu.columns.map((col) => (
                        <div key={col.heading}>
                          <p className="type-eyebrow mb-4 text-ink-subtle">{col.heading}</p>
                          <ul className="flex flex-col gap-2.5">
                            {col.links.map((link) => (
                              <li key={link.href}>
                                <Link href={link.href} className="text-sm text-ink-muted hover:text-ink">
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {menu.feature ? (
                        <Link
                          href={menu.feature.href}
                          className="group/feature col-start-4 justify-self-end rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                        >
                          <div className="relative aspect-[4/3] w-72 overflow-hidden rounded-sm bg-surface-muted">
                            <Image
                              src={menu.feature.image.src}
                              alt={menu.feature.image.alt}
                              fill
                              sizes="288px"
                              unoptimized={menu.feature.image.unoptimized ?? false}
                              className="object-cover"
                            />
                          </div>
                          <p className="mt-3 text-sm font-medium text-ink group-hover/feature:text-brand">
                            {menu.feature.title}
                          </p>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search/" aria-label="Search">
              <SearchIcon strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
            <Link href="/account/" aria-label="Account">
              <UserIcon strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </Button>
          <WishlistLink className="hidden sm:inline-flex" />
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
