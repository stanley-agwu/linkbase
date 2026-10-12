import { describe, expect, it } from "vitest";

import { THEME_IDS } from "@/lib/validation";
import type { ThemeId } from "@/lib/types";

import { resolveTheme } from "./resolve-theme";
import { PROFILE_TEMPLATES } from "./templates";

function template(id: ThemeId) {
  const found = PROFILE_TEMPLATES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No template with id ${id}`);
  return found;
}

describe("resolveTheme", () => {
  it("uses the template's own colours, radius and font by default", () => {
    const hem = template("hem");
    expect(
      resolveTheme({ themeId: "hem", buttonShape: "template", font: "template" }),
    ).toEqual({
      bg: hem.bg,
      fg: hem.fg,
      btnBg: hem.btnBg,
      btnFg: hem.btnFg,
      btnBorder: hem.btnBorder,
      avatar: hem.avatar,
      avatar2: hem.avatar2,
      radius: hem.radius,
      font: hem.font,
    });
  });

  it.for([
    { buttonShape: "square", radius: "0px" },
    { buttonShape: "soft", radius: "12px" },
    { buttonShape: "pill", radius: "999px" },
  ] as const)(
    "overrides the radius with $radius for the $buttonShape shape",
    ({ buttonShape, radius }) => {
      expect(
        resolveTheme({ themeId: "kiln", buttonShape, font: "template" }).radius,
      ).toBe(radius);
    },
  );

  it.for([
    { font: "dm-sans", variable: "--font-dm-sans" },
    { font: "bricolage", variable: "--font-bricolage" },
    { font: "mono", variable: "--font-jetbrains" },
  ] as const)(
    "overrides the font with $variable for $font",
    ({ font, variable }) => {
      expect(
        resolveTheme({ themeId: "kiln", buttonShape: "template", font }).font,
      ).toContain(`var(${variable})`);
    },
  );

  it("keeps the template's colours when shape and font are overridden", () => {
    const encore = template("encore");
    const theme = resolveTheme({
      themeId: "encore",
      buttonShape: "pill",
      font: "mono",
    });
    expect(theme.bg).toBe(encore.bg);
    expect(theme.btnBg).toBe(encore.btnBg);
  });

  it("falls back to Kiln for a theme id with no template", () => {
    const kiln = template("kiln");
    const theme = resolveTheme({
      // A stored value from a removed theme reaches here as an unknown id.
      themeId: "retired" as ThemeId,
      buttonShape: "template",
      font: "template",
    });
    expect(theme.bg).toBe(kiln.bg);
    expect(theme.radius).toBe(kiln.radius);
  });

  it("returns only theme fields, not the template's sample content", () => {
    const theme = resolveTheme({
      themeId: "rep",
      buttonShape: "template",
      font: "template",
    });
    expect(theme).not.toHaveProperty("name");
    expect(theme).not.toHaveProperty("links");
  });
});

describe("PROFILE_TEMPLATES", () => {
  it("has exactly one template for every theme id the schema accepts", () => {
    expect(PROFILE_TEMPLATES.map((candidate) => candidate.id).sort()).toEqual(
      [...THEME_IDS].sort(),
    );
  });
});
