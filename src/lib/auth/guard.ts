import "server-only";

import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "./session";

/** For account pages: redirect to sign-in (with return path) when there is no session. */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login/?next=${encodeURIComponent(nextPath)}`);
  return user;
}
