import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, parseSessionToken } from "@/modules/admin/session-token";

/**
 * Request proxy (Next.js 16). Handles admin session auth and refreshes the
 * Supabase session cookie on navigation so server components see a valid user
 * without a round trip. Does nothing when Supabase is not configured.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";
    if (isLoginPage) return NextResponse.next();

    const adminHost = process.env.ADMIN_HOST;
    if (adminHost) {
      const host = request.headers.get("host") ?? "";
      if (host !== adminHost) return new NextResponse(null, { status: 404 });
    }

    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login/", request.url));
    }

    const session = await parseSessionToken(token);
    if (!session) {
      const response = NextResponse.redirect(new URL("/admin/login/", request.url));
      response.cookies.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/admin" });
      return response;
    }

    const next = NextResponse.next();
    next.headers.set("x-admin-user-id", session.userId);
    next.headers.set("x-admin-role", session.role);
    return next;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        }
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|media/|placeholders/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
