import type { Metadata } from "next";

import { handleSchema } from "@/lib/validation";
import { SignUpForm } from "@/components/auth/sign-up-form";

const ONBOARDING_PATH = "/onboarding";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/signup">) {
  const { handle } = await searchParams;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-h3 font-extrabold">
          Create your account.
        </h1>
        <p className="m-0 text-md text-body">
          Just an email and a password. You’ll pick your link next.
        </p>
      </div>
      <SignUpForm next={afterSignUp(handle)} />
    </>
  );
}

/**
 * A new account has no username yet, so it always goes to onboarding next
 * (the proxy would send it there anyway). A handle claimed on the landing
 * page rides along so onboarding can prefill it.
 */
function afterSignUp(handle: unknown): string {
  const parsed = handleSchema.safeParse(handle);
  if (!parsed.success) return ONBOARDING_PATH;
  return `${ONBOARDING_PATH}?handle=${encodeURIComponent(parsed.data)}`;
}
