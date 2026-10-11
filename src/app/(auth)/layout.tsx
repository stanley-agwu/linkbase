import Link from "next/link";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth";
import { DEFAULT_AFTER_AUTH } from "@/lib/safe-redirect";
import { Logo } from "@/components/ui/logo";

/** Centred, chrome-free shell for /login and /signup. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  // Already signed in — nothing to do here (routing.md §4).
  if (await verifySession()) redirect(DEFAULT_AFTER_AUTH);

  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <header className="mx-auto w-full max-w-[1240px]">
        <Link href="/" aria-label="Linkbase home" className="inline-flex">
          <Logo size={22} />
        </Link>
      </header>
      <main className="mx-auto mt-16 flex w-full max-w-[440px] flex-col gap-8">
        {children}
      </main>
    </div>
  );
}
