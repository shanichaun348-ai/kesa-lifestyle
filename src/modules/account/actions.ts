"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { stateName } from "@/lib/india-states";
import { consumeRateLimit, limiterKey } from "@/lib/rate-limit";

import { addressSchema, preferencesSchema, profileSchema, reviewSchema, wishlistSyncSchema, wishlistToggleSchema } from "./schemas";
import { getAccountService } from "./server";
import { AccountError } from "./service";

export type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> | undefined };

type Ctx = { userId: string; email: string; service: NonNullable<ReturnType<typeof getAccountService>> };

/** Every account action starts here: a valid session is required and the user id comes from it, never from the client. */
async function ctx(): Promise<Ctx | ActionResult<never>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, code: "unauthenticated", message: "Please sign in." };
  const service = getAccountService();
  if (!service) return { ok: false, code: "not_configured", message: "Accounts are not available on this environment." };
  return { userId: user.id, email: user.email ?? "", service };
}

function isResult<T>(v: Ctx | ActionResult<T>): v is ActionResult<T> {
  return "ok" in v;
}

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AccountError) return { ok: false, code: error.code, message: error.message };
  console.error("[account] unexpected error", error);
  return { ok: false, code: "unexpected", message: "Something went wrong. Please try again." };
}

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.join(".")] = i.message;
  return out;
}

async function meta() {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    return { ipHash: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : undefined, userAgent: h.get("user-agent")?.slice(0, 200) ?? undefined };
  } catch {
    return { ipHash: undefined, userAgent: undefined };
  }
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const c = await ctx();
  if (isResult(c)) return c;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  try {
    await c.service.profile.update(c.userId, { firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone ? `+91${parsed.data.phone}` : null });
    revalidatePath("/account/profile/");
    return { ok: true, value: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function saveAddressAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (isResult(c)) return c;
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const a = parsed.data;
  const row = { label: a.label, fullName: a.fullName, phone: `+91${a.phone}`, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: stateName(a.stateCode), stateCode: a.stateCode, pincode: a.pincode, isDefaultShipping: a.isDefaultShipping };
  try {
    let id = a.id;
    if (id) await c.service.addresses.update(c.userId, id, row);
    else id = await c.service.addresses.create(c.userId, row);
    revalidatePath("/account/addresses/");
    return { ok: true, value: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAddressAction(input: { id: string }): Promise<ActionResult> {
  const c = await ctx();
  if (isResult(c)) return c;
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) return { ok: false, code: "invalid_input", message: "Invalid address." };
  try {
    await c.service.addresses.remove(c.userId, input.id);
    revalidatePath("/account/addresses/");
    return { ok: true, value: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function setDefaultAddressAction(input: { id: string }): Promise<ActionResult> {
  const c = await ctx();
  if (isResult(c)) return c;
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) return { ok: false, code: "invalid_input", message: "Invalid address." };
  try {
    await c.service.addresses.setDefault(c.userId, input.id);
    revalidatePath("/account/addresses/");
    return { ok: true, value: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function submitReviewAction(input: unknown): Promise<ActionResult<{ id: string | null }>> {
  const c = await ctx();
  if (isResult(c)) return c;
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const limit = await consumeRateLimit(getDb(), limiterKey("review:user", c.userId), 5, 86_400);
  if (!limit.allowed) return { ok: false, code: "rate_limited", message: "You have submitted several reviews today. Please try again tomorrow." };
  try {
    const id = await c.service.reviews.create(c.userId, parsed.data);
    revalidatePath("/account/reviews/");
    return { ok: true, value: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePreferencesAction(input: unknown): Promise<ActionResult> {
  const c = await ctx();
  if (isResult(c)) return c;
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Invalid preferences." };
  try {
    const m = await meta();
    await c.service.preferences.set(c.userId, c.email, parsed.data, { source: "account_preferences", ipHash: m.ipHash, userAgent: m.userAgent });
    revalidatePath("/account/preferences/");
    return { ok: true, value: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Merge the device wishlist into the account and return the account's slugs. */
export async function syncWishlistAction(input: unknown): Promise<ActionResult<{ slugs: string[] }>> {
  const c = await ctx();
  if (isResult(c)) return c;
  const parsed = wishlistSyncSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Invalid wishlist." };
  try {
    return { ok: true, value: { slugs: await c.service.wishlist.merge(c.userId, parsed.data.slugs) } };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleWishlistAction(input: unknown): Promise<ActionResult<{ saved: boolean }>> {
  const c = await ctx();
  if (isResult(c)) return c;
  const parsed = wishlistToggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Invalid product." };
  try {
    const result = await c.service.wishlist.toggle(c.userId, parsed.data.slug);
    revalidatePath("/account/wishlist/");
    return { ok: true, value: result };
  } catch (error) {
    return fail(error);
  }
}
