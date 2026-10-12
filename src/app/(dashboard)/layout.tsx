import { Suspense } from "react";

import { DashboardSidebar } from "./_components/dashboard-sidebar";

/**
 * The signed-in shell: sidebar on the left (a drawer below `lg`), the page
 * beside it (ui.md §2.4). Not an auth gate — pages check the session
 * themselves (auth.md §3).
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-page lg:flex-row">
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="hidden h-dvh w-62 shrink-0 border-r border-subtle bg-surface-card lg:block"
          />
        }
      >
        <DashboardSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
