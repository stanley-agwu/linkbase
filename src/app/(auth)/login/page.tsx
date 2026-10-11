import type { Metadata } from "next";

import { safeNextPath } from "@/lib/safe-redirect";
import { LogInForm } from "@/components/auth/log-in-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LogInPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-h3 font-extrabold">
          Welcome back.
        </h1>
        <p className="m-0 text-md text-body">Log in to edit your page.</p>
      </div>
      <LogInForm next={safeNextPath(typeof next === "string" ? next : null)} />
    </>
  );
}
