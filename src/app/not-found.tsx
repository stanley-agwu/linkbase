import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Page not found" };

/**
 * The app-wide 404: unmatched URLs, and notFound() from any segment without
 * its own not-found.tsx. Signed-out visitors only reach it on public paths,
 * since proxy.ts sends every other unknown path to /login (auth.md §4).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-page px-6 text-center">
      <Link href="/" aria-label="Linkbase home">
        <Logo size={24} />
      </Link>
      <p className="m-0 font-mono text-xs tracking-widest text-muted uppercase">
        404
      </p>
      <h1 className="m-0 font-display text-h3 font-extrabold">
        This page doesn’t exist.
      </h1>
      <p className="m-0 max-w-[420px] text-md text-body">
        The link may be broken, or the page may have moved.
      </p>
      <ButtonLink href="/" iconRight="→">
        Back to home
      </ButtonLink>
    </main>
  );
}
