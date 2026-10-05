import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/safe-next";
import { publicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Completes email confirmation, magic-link and password-recovery links by
 * exchanging the PKCE code for a session cookie on the server (ADR-32).
 * Redirect targets are restricted to same-origin paths.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = publicEnv.NEXT_PUBLIC_SITE_URL;

  if (!code || !publicEnv.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.redirect(`${origin}/login/?error=link`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login/?error=link`);
  return NextResponse.redirect(`${origin}${next}`);
}
