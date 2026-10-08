"use server";

import { redirect } from "next/navigation";

import { forgotPasswordFlow, loginFlow, registerFlow, resetPasswordFlow, type FlowResult } from "./flows";
import { getAuthFlowDeps as deps } from "./server";

const NOT_CONFIGURED: FlowResult<never> = { ok: false, code: "not_configured", message: "Accounts are not available on this environment yet." };

export async function registerAction(input: unknown): Promise<FlowResult<{ needsConfirmation: boolean; next: string }>> {
  const d = await deps();
  if (!d) return NOT_CONFIGURED;
  return registerFlow(d, input);
}

export async function loginAction(input: unknown): Promise<FlowResult<{ next: string }>> {
  const d = await deps();
  if (!d) return NOT_CONFIGURED;
  const result = await loginFlow(d, input);
  if (!result.ok) return result;
  return { ok: true, value: { next: result.value.next } };
}

export async function logoutAction(): Promise<void> {
  const d = await deps();
  if (d) await d.provider.signOut();
  redirect("/");
}

export async function forgotPasswordAction(input: unknown): Promise<FlowResult> {
  const d = await deps();
  if (!d) return NOT_CONFIGURED;
  return forgotPasswordFlow(d, input);
}

export async function resetPasswordAction(input: unknown): Promise<FlowResult> {
  const d = await deps();
  if (!d) return NOT_CONFIGURED;
  return resetPasswordFlow(d, input);
}
