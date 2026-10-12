import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

// The provider-free config: this reads the session cookie and never touches
// the database. The proxy runs on every matched request, prefetches included.
const { auth } = NextAuth(authConfig);

// /templates is marketing: the landing page and NavBar link to it.
const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/templates"]);

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/user/") || // public profiles
    pathname.startsWith("/api/auth/") // NextAuth's own endpoints
  );
}

const ONBOARDING_PATH = "/onboarding";

/**
 * Default-deny route gate (auth.md §4): everything is protected unless listed
 * public, and a signed-in user without a username is held at onboarding until
 * they choose one. UX redirects, not the security boundary — pages and actions
 * check the session (and the username) themselves.
 */
export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  if (!request.auth) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const onboarding = pathname === ONBOARDING_PATH;
  const hasUsername = Boolean(request.auth.user.username);
  if (!hasUsername && !onboarding) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.nextUrl));
  }
  if (hasUsername && onboarding) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)",
  ],
};
