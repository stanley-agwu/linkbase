import type { Metadata } from "next";

import { handleSchema, themeIdSchema } from "@/lib/validation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { StepBars } from "@/components/ui/step-bars";

const ONBOARDING_PATH = "/onboarding";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/signup">) {
  const { handle, template } = await searchParams;

  return (
    <>
      <StepBars total={3} current={1} />
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-h3 font-extrabold">
          Create your account.
        </h1>
        <p className="m-0 text-md text-body">
          Just an email and a password. You’ll pick your link next.
        </p>
      </div>
      <SignUpForm next={afterSignUp(handle, template)} />
    </>
  );
}

/**
 * A new account has no username yet, so it always goes to onboarding next
 * (the proxy would send it there anyway). A handle claimed on the landing
 * page, and a template picked there or in the gallery, ride along so
 * onboarding can prefill them.
 */
function afterSignUp(handle: unknown, template: unknown): string {
  const params = new URLSearchParams();
  const parsedHandle = handleSchema.safeParse(handle);
  if (parsedHandle.success) params.set("handle", parsedHandle.data);
  const parsedTemplate = themeIdSchema.safeParse(template);
  if (parsedTemplate.success) params.set("template", parsedTemplate.data);

  const query = params.toString();
  return query ? `${ONBOARDING_PATH}?${query}` : ONBOARDING_PATH;
}
