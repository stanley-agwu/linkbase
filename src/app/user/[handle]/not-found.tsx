import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/** An unknown or malformed handle. Doesn't say whether the name is taken. */
export default function UserNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-page px-6 text-center">
      <Link href="/" aria-label="Linkbase home">
        <Logo size={24} />
      </Link>
      <h1 className="m-0 font-display text-h3 font-extrabold">
        There’s no page here.
      </h1>
      <p className="m-0 max-w-[420px] text-md text-body">
        Check the address, or claim this name for yourself.
      </p>
      <ButtonLink href="/signup" iconRight="→">
        Get your own page
      </ButtonLink>
    </main>
  );
}
