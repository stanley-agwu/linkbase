import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUserId, verifySession } from "@/lib/auth";
import { getUsername } from "@/lib/db";
import { handleSchema, themeIdSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { StepBars } from "@/components/ui/step-bars";

import { continueToDashboard } from "./_actions";
import { UsernameForm } from "./_components/username-form";

export const metadata: Metadata = { title: "Choose your username" };

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const [userId, session, { handle, template }] = await Promise.all([
    requireUserId(),
    verifySession(),
    searchParams,
  ]);
  const username = await getUsername(userId);

  // Already onboarded and the cookie knows it: nothing to do here.
  if (username && session?.username) redirect("/dashboard");

  return (
    <main className="mx-auto mt-16 flex w-full max-w-[540px] flex-col gap-8">
      <StepBars total={3} current={2} />
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-h3 font-extrabold">
          {username ? "You’re all set." : "Choose your link."}
        </h1>
        <p className="m-0 text-md text-body">
          {username
            ? `Your page lives at /user/${username}.`
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
        <UsernameForm
          defaultValue={prefill(handle)}
          template={templateFrom(template)}
        />
      )}
    </main>
  );
}

/** A handle claimed on the landing page, carried through signup. */
function prefill(handle: unknown): string | undefined {
  const parsed = handleSchema.safeParse(handle);
  return parsed.success ? parsed.data : undefined;
}

/** A template picked on the landing page or gallery, for the look step. */
function templateFrom(template: unknown): string | undefined {
  const parsed = themeIdSchema.safeParse(template);
  return parsed.success ? parsed.data : undefined;
}
