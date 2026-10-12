"use server";

import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import { updateAppearance } from "@/lib/db";
import {
  type ActionResult,
  type ChooseLookInput,
  chooseLookSchema,
  validationError,
} from "@/lib/validation";

/** Saves the theme picked during onboarding, then opens the dashboard. */
export async function chooseLook(
  _previous: ActionResult<ChooseLookInput>,
  formData: FormData,
): Promise<ActionResult<ChooseLookInput>> {
  const userId = await requireUserId();

  const parsed = chooseLookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  await updateAppearance(userId, { themeId: parsed.data.themeId });
  redirect("/dashboard");
}
