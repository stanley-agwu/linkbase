import type {
  Appearance,
  ButtonShape,
  ProfileFont,
  ProfileTheme,
} from "@/lib/types";

import { PROFILE_TEMPLATES } from "./templates";

const RADII: Record<Exclude<ButtonShape, "template">, string> = {
  square: "0px",
  soft: "12px",
  pill: "999px",
};

// Variables from the root layout's next/font setup.
const FONTS: Record<Exclude<ProfileFont, "template">, string> = {
  "dm-sans": "var(--font-dm-sans), sans-serif",
  bricolage: "var(--font-bricolage), sans-serif",
  mono: "var(--font-jetbrains), monospace",
};

/**
 * The colours, radius and font a profile renders with: the chosen template,
 * with the owner's button shape and font laid over it. An unknown theme id
 * falls back to the first template (Kiln).
 */
export function resolveTheme({
  themeId,
  buttonShape,
  font,
}: Appearance): ProfileTheme {
  const template =
    PROFILE_TEMPLATES.find((candidate) => candidate.id === themeId) ??
    PROFILE_TEMPLATES[0];

  return {
    bg: template.bg,
    fg: template.fg,
    btnBg: template.btnBg,
    btnFg: template.btnFg,
    btnBorder: template.btnBorder,
    avatar: template.avatar,
    avatar2: template.avatar2,
    radius: buttonShape === "template" ? template.radius : RADII[buttonShape],
    font: font === "template" ? template.font : FONTS[font],
  };
}
