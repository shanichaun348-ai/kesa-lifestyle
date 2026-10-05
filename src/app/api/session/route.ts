import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Minimal session info for client islands (header state, wishlist sync). No PII beyond the email. */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user: user ? { id: user.id, email: user.email } : null }, { headers: { "Cache-Control": "private, no-store" } });
}
