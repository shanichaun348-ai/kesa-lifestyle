import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { getAnnouncement } from "@/modules/content/announcement-server";
import { listCoupons } from "@/modules/coupons/admin";
import { isSupabaseConfigured } from "@/lib/supabase";

import { AnnouncementForm } from "./_form";

export default async function AnnouncementPage() {
  const session = await requireAdmin("content:read");
  const canWrite = hasPermission(session.role, "content:write");
  const [{ value, error }, coupons] = await Promise.all([getAnnouncement(), isSupabaseConfigured() ? listCoupons().catch(() => []) : Promise.resolve([])]);
  const codes = coupons.filter((c) => c.status === "active").map((c) => c.code);

  return (
    <div className="space-y-6">
      <PageHeader title="Announcement bar" back={{ href: "/admin/content/", label: "Content" }} description="The offer strip at the top of every page" />
      {error && error.code !== "unconfigured" ? (
        <p role="alert" className="rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-ink">{error.message}</p>
      ) : null}
      <AnnouncementForm initial={value} codes={codes} canWrite={canWrite} />
    </div>
  );
}
