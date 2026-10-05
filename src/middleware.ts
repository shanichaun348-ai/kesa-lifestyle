import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, parseSessionToken } from "@/modules/admin/session-token";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Allow the login page through before any auth check.
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";
  if (isLoginPage) return NextResponse.next();

  // Production: optionally restrict the admin to a dedicated hostname (ADR-31).
  const adminHost = process.env.ADMIN_HOST;
  if (adminHost) {
    const host = request.headers.get("host") ?? "";
    if (host !== adminHost) {
      return new NextResponse(null, { status: 404 });
    }
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login/", request.url));
  }

  const session = await parseSessionToken(token);
  if (!session) {
    const response = NextResponse.redirect(new URL("/admin/login/", request.url));
    // Clear the invalid / expired cookie.
    response.cookies.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/admin" });
    return response;
  }

  // Propagate identity as request headers so server components can read it
  // without re-verifying the HMAC (defence-in-depth: guard.ts still re-verifies).
  const next = NextResponse.next();
  next.headers.set("x-admin-user-id", session.userId);
  next.headers.set("x-admin-role", session.role);
  return next;
}

export const config = {
  matcher: ["/admin/:path*"],
};
