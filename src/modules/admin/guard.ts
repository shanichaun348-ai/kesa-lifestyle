import "server-only";

import { redirect } from "next/navigation";

import type { AdminPermission } from "./rbac";
import { hasPermission } from "./rbac";
import { getAdminSession } from "./session";
import type { AdminSession } from "./types";

/**
 * Call at the top of every admin Server Component and Server Action.
 * Redirects to login if unauthenticated; to dashboard if lacking the permission.
 */
export async function requireAdmin(permission?: AdminPermission): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login/");
  if (permission && !hasPermission(session.role, permission)) redirect("/admin/");
  return session;
}
