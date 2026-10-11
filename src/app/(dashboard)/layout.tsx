import { Suspense } from "react";
import Link from "next/link";

import { HeaderAccount } from "@/components/auth/header-account";
import { Logo } from "@/components/ui/logo";

/**
 * The signed-in shell: a flat top bar (ui.md §2.4). Not an auth gate — pages
 * check the session themselves (auth.md §3).
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b border-subtle bg-surface-card px-5 py-3">
        <Link href="/dashboard" aria-label="Linkbase dashboard">
          <Logo size={20} />
        </Link>
        <div className="flex-1" />
        <Suspense fallback={<span aria-hidden="true" className="h-11 w-11" />}>
          <HeaderAccount />
        </Suspense>
      </header>
      {children}
    </div>
  );
}
