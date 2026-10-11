import type { Metadata } from "next";

import { requireUsername } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

/** Placeholder destination after sign-in until the editor lands. */
export default async function DashboardPage() {
  // The page checks identity and onboarding itself; the proxy is only a
  // pre-filter.
  const { username } = await requireUsername();

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-6 py-12">
      <h1 className="m-0 font-display text-h3 font-extrabold">
        Welcome, {username}.
      </h1>
      <p className="m-0 text-md text-body">
        Your page lives at linkbase.me/{username}. Your link editor will live
        here.
      </p>
    </main>
  );
}
