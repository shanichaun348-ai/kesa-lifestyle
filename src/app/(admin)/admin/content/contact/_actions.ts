"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { contactSchema } from "@/modules/content/contact";
import { saveContact } from "@/modules/content/contact-server";

export type ContactState = { error: string } | { success: string } | null;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** Saves the details shown on the Contact us page (and used by the WhatsApp buttons). */
export async function updateContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const session = await requireAdmin("content:write");

  const parsed = contactSchema.safeParse({
    intro: field(formData, "intro"),
    phone: field(formData, "phone"),
    whatsapp: field(formData, "whatsapp"),
    email: field(formData, "email"),
    address: field(formData, "address"),
    hours: field(formData, "hours"),
    mapUrl: field(formData, "mapUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const result = await saveContact(parsed.data);
  if (!result.ok) return { error: result.error.message };

  auditLog(session, "content.update", { key: "site.contact", fields: Object.keys(parsed.data).filter((k) => parsed.data[k as keyof typeof parsed.data] !== undefined) });
  // The chrome (footer and the floating WhatsApp button) reads the WhatsApp number too.
  revalidatePath("/", "layout");
  revalidatePath("/contact/");
  revalidatePath("/admin/content/contact/");
  return { success: "Saved. The Contact us page is updated." };
}
