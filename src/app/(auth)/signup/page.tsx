import type { Metadata } from "next";

import { handleSchema } from "@/lib/validation";
import { DEFAULT_AFTER_AUTH, safeNextPath } from "@/lib/safe-redirect";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/signup">) {
  const { next, handle } = await searchParams;

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
      <SignUpForm next={afterSignUp(next, handle)} />
    </>
  );
}

/**
 * An explicit `next` wins. Otherwise a handle claimed on the landing page is
 * carried to the dashboard so onboarding can prefill it — signup itself
 * doesn't ask for one.
 */
function afterSignUp(next: unknown, handle: unknown): string {
  if (typeof next === "string") return safeNextPath(next);

  const parsed = handleSchema.safeParse(handle);
  if (!parsed.success) return DEFAULT_AFTER_AUTH;
  return `${DEFAULT_AFTER_AUTH}?handle=${encodeURIComponent(parsed.data)}`;
}
