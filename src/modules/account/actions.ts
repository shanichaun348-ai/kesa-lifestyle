"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { stateName } from "@/lib/india-states";

import { addressSchema, profileSchema } from "./schemas";
import { AccountError } from "./errors";
import { getAccountService } from "./server";

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

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const c = await ctx();
  if (isResult(c)) return c;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  try {
    // Make sure the row exists before updating (covers users created before the trigger).
    await c.service.profile.get(c.userId, c.email);
    await c.service.profile.update(c.userId, { firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone ? `+91${parsed.data.phone}` : null });
    revalidatePath("/account/profile/");
    revalidatePath("/account/");
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
    await c.service.profile.get(c.userId, c.email);
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
