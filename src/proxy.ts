import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

// The provider-free config: this reads the session cookie and never touches
// the database. The proxy runs on every matched request, prefetches included.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/user/") || // public profiles
    pathname.startsWith("/api/auth/") // NextAuth's own endpoints
  );
}

/**
 * Default-deny route gate (auth.md §4): everything is protected unless listed
 * public. A UX redirect, not the security boundary — pages and actions check
 * the session themselves.
 */
export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  if (request.auth || isPublic(pathname)) return NextResponse.next();

  const url = new URL("/login", request.nextUrl);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)",
  ],
};
