import { SessionProvider } from "@/components/auth/session-provider";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { sampleFooterColumns, sampleHeaderMenus } from "@/lib/navigation";

const secondaryLinks = [
  { label: "About Kesa", href: "/about/" },
  { label: "Journal", href: "/journal/" },
  { label: "Style guides", href: "/style-guides/" },
  { label: "Track order", href: "/track-order/" },
  { label: "Contact", href: "/contact/" },
];

/**
 * Storefront chrome. Navigation and cart lines are sample data until the
 * navigation and cart modules exist; the components themselves are final.
 */
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <AnnouncementBar
        id="launch-shipping"
        message="Free shipping across India on orders over ₹999."
        href="/collections/new-arrivals/"
        linkLabel="Shop new in"
      />
      <SiteHeader menus={sampleHeaderMenus} secondaryLinks={secondaryLinks} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter columns={sampleFooterColumns} />
    </SessionProvider>
  );
}
