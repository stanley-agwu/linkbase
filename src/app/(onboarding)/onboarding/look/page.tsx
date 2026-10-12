import type { Metadata } from "next";

import { requireUsername } from "@/lib/auth";
import { getProfileSettings } from "@/lib/db";
import { themeIdSchema } from "@/lib/validation";
import { TEMPLATE_FONT_VARIABLES } from "@/components/profile/template-fonts";
import { StepBars } from "@/components/ui/step-bars";

import { LookForm } from "./_components/look-form";

export const metadata: Metadata = { title: "Pick a look" };

/**
 * The last onboarding step. Preselects a template chosen before signup,
 * otherwise whatever the user already has (Kiln by default).
 */
export default async function LookPage({
  searchParams,
}: PageProps<"/onboarding/look">) {
  const [{ userId, username }, { template }] = await Promise.all([
    requireUsername(),
    searchParams,
  ]);
  const picked = themeIdSchema.safeParse(template);
  const initialThemeId = picked.success
    ? picked.data
    : (await getProfileSettings(userId)).themeId;

  return (
    <main
      className={`mx-auto mt-16 flex w-full max-w-[1100px] flex-col gap-8 ${TEMPLATE_FONT_VARIABLES}`}
    >
      <div className="w-full max-w-[540px]">
        <StepBars total={3} current={3} />
      </div>
      <LookForm username={username} initialThemeId={initialThemeId} />
    </main>
  );
}
