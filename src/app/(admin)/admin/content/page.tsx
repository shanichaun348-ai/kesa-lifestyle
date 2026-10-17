import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";

const SECTIONS = [
  { title: "Announcement bar", desc: "The offer strip at the top of every page, with an optional coupon code", href: "/admin/content/announcement/" },
  { title: "Homepage sections", desc: "Hero, banners, product rails, brand statement", href: "/admin/content/homepage/" },
  { title: "Collections", desc: "Edit collection names, descriptions and images", href: "/admin/content/collections/" },
  { title: "Journal posts", desc: "Articles, style stories and guides", href: "/admin/content/journal/" },
  { title: "FAQs", desc: "Frequently asked questions shown on product and category pages", href: "/admin/content/faqs/" },
  { title: "Gift guides", desc: "Curated gift-guide pages with product picks", href: "/admin/content/guides/?type=gift" },
  { title: "Contact us page", desc: "Phone, WhatsApp, email, address and opening hours", href: "/admin/content/contact/" },
];

export default async function ContentHubPage() {
  await requireAdmin("content:read");

  return (
    <div className="space-y-6">
      <PageHeader title="Content" description="Manage storefront content and editorial" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="rounded-md border border-line bg-surface p-5 hover:border-ink-muted hover:shadow-(--shadow-float) transition-shadow"
          >
            <p className="font-medium text-ink">{s.title}</p>
            <p className="mt-1 text-sm text-ink-muted">{s.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
