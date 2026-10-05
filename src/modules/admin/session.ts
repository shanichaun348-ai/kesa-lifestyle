import "server-only";

import { cookies } from "next/headers";

import { ADMIN_COOKIE, SESSION_TTL, createSessionToken, makeSession, parseSessionToken } from "./session-token";
import type { AdminSession } from "./types";

export type { AdminSession };
export { ADMIN_COOKIE, SESSION_TTL, createSessionToken, makeSession, parseSessionToken };

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function setAdminSession(session: AdminSession): Promise<void> {
  const token = await createSessionToken(session);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_TTL,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 0,
  });
}
