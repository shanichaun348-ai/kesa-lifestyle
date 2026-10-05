"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";

export type CouponFormState = { error: string } | null;

export async function createCoupon(prevState: CouponFormState, formData: FormData): Promise<CouponFormState> {
  const session = await requireAdmin("coupons:write");

  const code = formData.get("code");
  const type = formData.get("type");
  const value = formData.get("value");

  if (typeof code !== "string" || !code.trim()) return { error: "Coupon code is required." };
  if (!/^[A-Z0-9_-]+$/.test(code.trim())) return { error: "Code must be uppercase letters, numbers, hyphens and underscores only." };
  if (typeof type !== "string" || !["percent", "fixed"].includes(type)) return { error: "Invalid coupon type." };
  if (typeof value !== "string" || isNaN(Number(value)) || Number(value) <= 0) return { error: "Value must be a positive number." };
  if (type === "percent" && Number(value) > 100) return { error: "Percent discount cannot exceed 100%." };

  auditLog(session, "coupon.create", { code, type, value });
  revalidatePath("/admin/coupons/");
  redirect("/admin/coupons/");
}
