import { SessionProvider } from "@/components/auth/session-provider";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { CartSync } from "@/components/storefront/cart-sync";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { sampleFooterColumns, sampleHeaderMenus } from "@/lib/navigation";
import { announcementId } from "@/modules/content/announcement";
import { getAnnouncement } from "@/modules/content/announcement-server";

const secondaryLinks = [
  { label: "About Kesa", href: "/about/" },
  { label: "Style guides", href: "/style-guides/" },
  { label: "Track order", href: "/track-order/" },
  { label: "Contact", href: "/contact/" },
];

/**
 * Storefront chrome. Navigation and cart lines are sample data until the
 * navigation and cart modules exist; the components themselves are final.
 * The announcement strip is owner-editable (Admin → Content → Announcement bar).
 */
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const { value: announcement } = await getAnnouncement();

  return (
    <SessionProvider>
      {announcement.enabled ? (
        <AnnouncementBar
          id={announcementId(announcement)}
          message={announcement.message}
          code={announcement.code}
          href={announcement.href}
          linkLabel={announcement.linkLabel}
        />
      ) : null}
      <SiteHeader menus={sampleHeaderMenus} secondaryLinks={secondaryLinks} />
      {/* overflow-x-clip: a stray wide element can never widen the page on a phone; sticky still works since clip is not a scroll container. */}
      <main id="main" className="flex-1 overflow-x-clip">
        {children}
      </main>
      <SiteFooter columns={sampleFooterColumns} />
      <WhatsAppButton />
      <CartSync />
    </SessionProvider>
  );
}
