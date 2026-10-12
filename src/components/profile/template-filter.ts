import type { ProfileTemplate, TemplateCategory } from "@/lib/types";

import { PROFILE_TEMPLATES, TEMPLATE_CATEGORIES } from "./templates";

/** One entry in the gallery's category filter. */
export type TemplateFilter = {
  label: string;
  href: string;
  selected: boolean;
};

/**
 * A known category from `?category=`, or null (All) for anything else —
 * missing, misspelt, or repeated (which arrives as an array).
 */
export function templateCategoryFrom(value: unknown): TemplateCategory | null {
  return TEMPLATE_CATEGORIES.find((category) => category === value) ?? null;
}

/** The templates in a category, in gallery order; all of them for null. */
export function templatesIn(
  category: TemplateCategory | null,
): ProfileTemplate[] {
  return category
    ? PROFILE_TEMPLATES.filter((template) => template.category === category)
    : PROFILE_TEMPLATES;
}

/** "All" followed by every category, each linking to its filtered gallery. */
export function templateFilters(
  selected: TemplateCategory | null,
): TemplateFilter[] {
  return [null, ...TEMPLATE_CATEGORIES].map((category) => ({
    label: category ?? "All",
    href: category
      ? `/templates?category=${encodeURIComponent(category)}`
      : "/templates",
    selected: category === selected,
  }));
}
