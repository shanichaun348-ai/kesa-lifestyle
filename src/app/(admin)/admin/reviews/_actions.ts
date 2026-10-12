"use server";

import { revalidatePath } from "next/cache";

import { auditLog } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/admin/guard";
import { deleteReview, moderateReview } from "@/modules/reviews/supabase-reviews";

export type ReviewActionState = { error: string } | { success: string } | null;

function revalidate(productSlug: string) {
  revalidatePath("/admin/reviews/");
  revalidatePath(`/products/${productSlug}/`);
  revalidatePath("/");
}

export async function approveReview(id: string): Promise<ReviewActionState> {
  const session = await requireAdmin("reviews:moderate");
  const result = await moderateReview(id, "approved");
  if (!result.ok) return { error: result.error };
  auditLog(session, "review.approve", { reviewId: id, productSlug: result.productSlug });
  revalidate(result.productSlug);
  return { success: "Review published." };
}

export async function rejectReview(id: string, note: string): Promise<ReviewActionState> {
  const session = await requireAdmin("reviews:moderate");
  const result = await moderateReview(id, "rejected", note);
  if (!result.ok) return { error: result.error };
  auditLog(session, "review.reject", { reviewId: id, productSlug: result.productSlug, note: note.trim() || undefined });
  revalidate(result.productSlug);
  return { success: "Review rejected." };
}

export async function removeReview(id: string): Promise<ReviewActionState> {
  const session = await requireAdmin("reviews:moderate");
  const result = await deleteReview(id);
  if (!result.ok) return { error: result.error };
  auditLog(session, "review.delete", { reviewId: id, productSlug: result.productSlug });
  revalidate(result.productSlug);
  return { success: "Review deleted." };
}
