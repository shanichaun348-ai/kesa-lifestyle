/**
 * Edge-compatible session token utilities.
 * Imported by src/middleware.ts — no Buffer, no Node.js-only APIs, no "server-only".
 * HMAC-SHA256 signed tokens using Web Crypto API.
 */
import type { AdminSession } from "./types";

// __Secure- prefix requires the Secure flag (HTTPS), so we only apply it in
// production. In development (HTTP) the unprefixed name is used instead.
// (Cannot use __Host- because path is /admin, not /.)
export const ADMIN_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-kesa_admin_session"
    : "kesa_admin_session";
export const SESSION_TTL = 8 * 60 * 60; // 8 hours

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(data: Uint8Array): string {
  let str = "";
  for (let i = 0; i < data.length; i++) str += String.fromCharCode(data[i] ?? 0);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const rem = padded.length % 4;
  const padded2 = rem ? padded + "=".repeat(4 - rem) : padded;
  const binary = atob(padded2);
  // Explicit Uint8Array construction ensures .buffer is ArrayBuffer (not SharedArrayBuffer),
  // which is required by crypto.subtle.verify's BufferSource parameter.
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i) & 0xff;
  return result;
}

function requireSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET ?? "";
  if (s.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters");
  return s;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSessionToken(session: AdminSession): Promise<string> {
  const payload = b64urlEncode(enc.encode(JSON.stringify(session)));
  const key = await hmacKey(requireSecret());
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${payload}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function parseSessionToken(token: string): Promise<AdminSession | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sigStr = token.slice(dot + 1);
  try {
    const key = await hmacKey(requireSecret());
    const sigBytes = b64urlDecode(sigStr);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
    if (!valid) return null;
    const raw = dec.decode(b64urlDecode(payload));
    const session = JSON.parse(raw) as AdminSession;
    if (typeof session.exp !== "number" || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function makeSession(user: { id: string; email: string; name: string; role: AdminSession["role"] }): AdminSession {
  const now = Math.floor(Date.now() / 1000);
  return { userId: user.id, email: user.email, name: user.name, role: user.role, iat: now, exp: now + SESSION_TTL };
}
