import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/api/trpc",
  "/favicon.ico",
];

const MOBILE_UA = /iPhone|Android.*Mobile|webOS|iPod/i;

const SKIP_MOBILE_REDIRECT = [
  "/api",
  "/_next",
  "/m/",
  "/login",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/logo");
}

function shouldSkipMobileRedirect(pathname: string): boolean {
  if (SKIP_MOBILE_REDIRECT.some((p) => pathname.startsWith(p))) return true;
  // Skip static files
  if (/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff2?|ttf|map|json)$/i.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Mobile UA redirect: `/` or `/app*` → `/m/chat`
  if (!shouldSkipMobileRedirect(pathname)) {
    const ua = request.headers.get("user-agent") ?? "";
    if (MOBILE_UA.test(ua) && (pathname === "/" || pathname.startsWith("/app"))) {
      const mobileUrl = new URL("/m/chat", request.url);
      return NextResponse.redirect(mobileUrl);
    }
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("hyprnova_session")?.value;

  if (!token) {
    // API routes get a 401 JSON response, not a redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
