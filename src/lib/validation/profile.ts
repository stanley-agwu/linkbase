import { z } from "zod";

import type { ButtonShape, ProfileFont, ThemeId } from "@/lib/types";

export const THEME_IDS = [
  "kiln",
  "tidepool",
  "halfpipe",
  "encore",
  "ledger",
  "hem",
  "rep",
] as const satisfies readonly ThemeId[];

export const BUTTON_SHAPES = [
  "template",
  "square",
  "soft",
  "pill",
] as const satisfies readonly ButtonShape[];

export const PROFILE_FONTS = [
  "template",
  "dm-sans",
  "bricolage",
  "mono",
] as const satisfies readonly ProfileFont[];

export const DISPLAY_NAME_MAX_LENGTH = 60;
export const BIO_MAX_LENGTH = 160;

export const themeIdSchema = z.enum(THEME_IDS, { error: "Pick a theme." });
export const buttonShapeSchema = z.enum(BUTTON_SHAPES, {
  error: "Pick a button shape.",
});
export const profileFontSchema = z.enum(PROFILE_FONTS, {
  error: "Pick a font.",
});

/** Appearance saves one choice at a time, so every field is optional. */
export const updateAppearanceSchema = z.object({
  themeId: themeIdSchema.optional(),
  buttonShape: buttonShapeSchema.optional(),
  font: profileFontSchema.optional(),
});

export const chooseLookSchema = z.object({ themeId: themeIdSchema });

/** An empty field clears the value; the page falls back to the username. */
export const updateProfileSchema = z.object({
  displayName: z
    .string({ error: "Enter a name." })
    .trim()
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    ),
  bio: z
    .string({ error: "Enter a bio." })
    .trim()
    .max(BIO_MAX_LENGTH, `Use ${BIO_MAX_LENGTH} characters or fewer.`),
});

export type UpdateAppearanceInput = z.infer<typeof updateAppearanceSchema>;
export type ChooseLookInput = z.infer<typeof chooseLookSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
