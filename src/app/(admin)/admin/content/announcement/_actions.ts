"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { announcementSchema } from "@/modules/content/announcement";
import { saveAnnouncement } from "@/modules/content/announcement-server";

export type AnnouncementState = { error: string } | { success: string } | null;

export async function updateAnnouncement(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const session = await requireAdmin("content:write");

  const parsed = announcementSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    message: String(formData.get("message") ?? ""),
    code: String(formData.get("code") ?? ""),
    href: String(formData.get("href") ?? ""),
    linkLabel: String(formData.get("linkLabel") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  if (parsed.data.href && !parsed.data.linkLabel) return { error: "Give the link a label, e.g. Shop now." };

  const result = await saveAnnouncement(parsed.data);
  if (!result.ok) return { error: result.error.message };

  auditLog(session, "content.update", { key: "site.announcement", enabled: parsed.data.enabled, code: parsed.data.code ?? null });
  revalidatePath("/", "layout");
  revalidatePath("/admin/content/announcement/");
  return { success: parsed.data.enabled ? "Saved. The strip is showing on every page." : "Saved. The strip is hidden." };
}
