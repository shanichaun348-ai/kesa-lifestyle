"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { createCoupon, deleteCoupon, setCouponActive, updateCoupon } from "@/modules/coupons/admin";
import { parseCouponForm } from "@/modules/coupons/form";

export type CouponFormState = { error: string } | { success: string } | null;

const FIELDS = ["code", "description", "type", "value", "minOrderRupees", "maxDiscountRupees", "startsAt", "endsAt", "usageLimit", "perCustomerLimit", "firstOrderOnly", "active"] as const;

function fields(formData: FormData) {
  return Object.fromEntries(FIELDS.map((k) => [k, formData.get(k)]));
}

function revalidate(id?: string) {
  revalidatePath("/admin/coupons/");
  if (id) revalidatePath(`/admin/coupons/${id}/`);
}

export async function createCouponAction(_prev: CouponFormState, formData: FormData): Promise<CouponFormState> {
  const session = await requireAdmin("coupons:write");
  const parsed = parseCouponForm(fields(formData));
  if (!parsed.ok) return { error: parsed.error };

  const result = await createCoupon(parsed.input);
  if (!result.ok) return { error: result.error };

  auditLog(session, "coupon.create", { id: result.id, code: parsed.input.code, type: parsed.input.type, value: parsed.input.value });
  revalidate();
  redirect(`/admin/coupons/${result.id}/?created=1`);
}

export async function updateCouponAction(id: string, _prev: CouponFormState, formData: FormData): Promise<CouponFormState> {
  const session = await requireAdmin("coupons:write");
  const parsed = parseCouponForm(fields(formData));
  if (!parsed.ok) return { error: parsed.error };

  const result = await updateCoupon(id, parsed.input);
  if (!result.ok) return { error: result.error };

  auditLog(session, "coupon.update", { id, code: parsed.input.code });
  revalidate(id);
  return { success: parsed.input.active ? "Saved. The code is live." : "Saved as inactive." };
}

export async function setCouponActiveAction(id: string, active: boolean): Promise<void> {
  const session = await requireAdmin("coupons:write");
  const result = await setCouponActive(id, active);
  if (!result.ok) redirect(`/admin/coupons/${id}/?error=${encodeURIComponent(result.error)}`);
  auditLog(session, "coupon.update", { id, active });
  revalidate(id);
}

export async function deleteCouponAction(id: string): Promise<void> {
  const session = await requireAdmin("coupons:write");
  const result = await deleteCoupon(id);
  if (!result.ok) redirect(`/admin/coupons/${id}/?error=${encodeURIComponent(result.error)}`);
  auditLog(session, "coupon.delete", { id });
  revalidate();
  redirect("/admin/coupons/");
}
