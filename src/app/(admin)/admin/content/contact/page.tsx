import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";
import { hasPermission } from "@/modules/admin/rbac";
import { getContact } from "@/modules/content/contact-server";

import { ContactForm } from "./_form";

export default async function ContactEditorPage() {
  const session = await requireAdmin("content:read");
  const canWrite = hasPermission(session.role, "content:write");
  const { value, error } = await getContact();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact us page"
        back={{ href: "/admin/content/", label: "Content" }}
        description="The phone, WhatsApp, email, address and hours customers see"
        actions={
          <Link href="/contact/" target="_blank" className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-4 text-sm text-ink hover:bg-surface-muted">
            View page
          </Link>
        }
      />
      {error && error.code !== "unconfigured" ? (
        <p role="alert" className="rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-ink">{error.message}</p>
      ) : null}
      <ContactForm initial={value} canWrite={canWrite} />
    </div>
  );
}
