import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUserId, verifySession } from "@/lib/auth";
import { getUsername } from "@/lib/db";
import { handleSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";

import { continueToDashboard } from "./_actions";
import { UsernameForm } from "./_components/username-form";

export const metadata: Metadata = { title: "Choose your username" };

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const [userId, session, { handle }] = await Promise.all([
    requireUserId(),
    verifySession(),
    searchParams,
  ]);
  const username = await getUsername(userId);

  // Already onboarded and the cookie knows it: nothing to do here.
  if (username && session?.username) redirect("/dashboard");

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-h3 font-extrabold">
          {username ? "You’re all set." : "Choose your link."}
        </h1>
        <p className="m-0 text-md text-body">
          {username
            ? `Your page lives at linkbase.me/${username}.`
            : "This is your username and your public page address. You can’t change it later."}
        </p>
      </div>
      {username ? (
        // The username was chosen in another session; this cookie is stale.
        <form action={continueToDashboard}>
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </form>
      ) : (
        <UsernameForm defaultValue={prefill(handle)} />
      )}
    </>
  );
}

/** A handle claimed on the landing page, carried through signup. */
function prefill(handle: unknown): string | undefined {
  const parsed = handleSchema.safeParse(handle);
  return parsed.success ? parsed.data : undefined;
}
