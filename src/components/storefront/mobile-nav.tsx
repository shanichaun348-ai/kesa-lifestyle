"use client";

import * as React from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavLink, NavMenu } from "@/lib/navigation";

type MobileNavProps = {
  menus: NavMenu[];
  secondaryLinks: NavLink[];
};

/**
 * Full-height sheet from the left. Menus with columns become accordions;
 * plain menus are links. Closing returns focus to the trigger (Radix).
 */
export function MobileNav({ menus, secondaryLinks }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="-ml-2 lg:hidden">
          <MenuIcon strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 p-0">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-normal">Menu</SheetTitle>
          <SheetDescription className="sr-only">Browse Kesa Lifestyle</SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-2">
          <Accordion type="multiple" className="border-t-0">
            {menus.map((menu) =>
              menu.columns ? (
                <AccordionItem key={menu.href} value={menu.href}>
                  <AccordionTrigger className="text-lg font-normal">{menu.label}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-5">
                      {menu.columns.map((col) => (
                        <div key={col.heading}>
                          <p className="type-eyebrow mb-2 text-ink-subtle">{col.heading}</p>
                          <ul className="flex flex-col">
                            {col.links.map((link) => (
                              <li key={link.href}>
                                <SheetClose asChild>
                                  <Link
                                    href={link.href}
                                    className="flex min-h-11 items-center text-base text-ink hover:text-brand"
                                  >
                                    {link.label}
                                  </Link>
                                </SheetClose>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <SheetClose asChild>
                        <Link href={menu.href} className="text-sm font-medium text-brand underline underline-offset-4">
                          View all {menu.label.toLowerCase()}
                        </Link>
                      </SheetClose>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <div key={menu.href} className="border-b border-line">
                  <SheetClose asChild>
                    <Link href={menu.href} className="flex min-h-12 items-center py-3 text-lg text-ink hover:text-brand">
                      {menu.label}
                    </Link>
                  </SheetClose>
                </div>
              ),
            )}
          </Accordion>

          <ul className="mt-6 flex flex-col">
            {secondaryLinks.map((link) => (
              <li key={link.href}>
                <SheetClose asChild>
                  <Link href={link.href} className="flex min-h-11 items-center text-sm text-ink-muted hover:text-ink">
                    {link.label}
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
