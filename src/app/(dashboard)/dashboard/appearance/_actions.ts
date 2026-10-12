"use server";

import { refresh } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { updateAppearance as updateAppearanceRow } from "@/lib/db";
import {
  type ActionResult,
  type UpdateAppearanceInput,
  updateAppearanceSchema,
} from "@/lib/validation";

/**
 * Saves one Appearance choice the moment it's picked. Called from an event
 * handler, so there's no FormData to echo. `updateAppearanceRow` clears the
 * public page's cache; refresh() updates the live preview.
 */
export async function updateAppearance(
  input: UpdateAppearanceInput,
): Promise<ActionResult<UpdateAppearanceInput>> {
  const userId = await requireUserId();

  const parsed = updateAppearanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: {},
      formError: "That choice couldn’t be saved. Try another.",
      values: {},
    };
  }

  await updateAppearanceRow(userId, parsed.data);

  refresh();
  return { status: "success", data: null };
}
