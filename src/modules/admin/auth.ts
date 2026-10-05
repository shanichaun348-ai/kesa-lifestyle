/**
 * Admin credential verification.
 *
 * Bootstrap admin: credentials come from environment variables.
 * This is replaced by Supabase-backed admin_users table once D10 (database) is resolved.
 */
import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

import type { AdminUser } from "./types";

function getBootstrapUser(): AdminUser | null {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  if (!email) return null;
  return {
    id: "bootstrap",
    email,
    name: process.env.ADMIN_BOOTSTRAP_NAME ?? "Admin",
    role: "owner",
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const hash = parts[2];
  if (!salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const stored_hash = Buffer.from(hash, "hex");
    if (candidate.length !== stored_hash.length) return false;
    return timingSafeEqual(candidate, stored_hash);
  } catch {
    return false;
  }
}

export function verifyAdminCredentials(email: string, password: string): AdminUser | null {
  const user = getBootstrapUser();
  if (!user || user.email !== email) return null;
  const storedHash = process.env.ADMIN_BOOTSTRAP_PASSWORD_HASH;
  if (!storedHash) return null;
  return verifyPassword(password, storedHash) ? user : null;
}
