import { describe, expect, it } from "vitest";

import {
  templateCategoryFrom,
  templateFilters,
  templatesIn,
} from "./template-filter";
import { PROFILE_TEMPLATES, TEMPLATE_CATEGORIES } from "./templates";

describe("templateCategoryFrom", () => {
  it.for([...TEMPLATE_CATEGORIES])("reads the %s category", (category) => {
    expect(templateCategoryFrom(category)).toBe(category);
  });

  it("reads a missing ?category= as All", () => {
    expect(templateCategoryFrom(undefined)).toBeNull();
  });

  it.for(["Nope", "", "music", "MUSIC", "Small%20business"])(
    "reads an unknown category, %j, as All",
    (value) => {
      expect(templateCategoryFrom(value)).toBeNull();
    },
  );

  it("reads a repeated ?category=, which arrives as an array, as All", () => {
    expect(templateCategoryFrom(["Music", "Travel"])).toBeNull();
  });
});

describe("templatesIn", () => {
  it("returns every template for All", () => {
    expect(templatesIn(null)).toHaveLength(PROFILE_TEMPLATES.length);
  });

  it("returns only Encore for Music", () => {
    expect(templatesIn("Music").map((template) => template.id)).toEqual([
      "encore",
    ]);
  });

  it.for([...TEMPLATE_CATEGORIES])(
    "returns only %s templates for that category",
    (category) => {
      const templates = templatesIn(category);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.category === category)).toBe(true);
    },
  );
});

describe("templateFilters", () => {
  it("lists All first, then every category in gallery order", () => {
    expect(templateFilters(null).map((filter) => filter.label)).toEqual([
      "All",
      ...TEMPLATE_CATEGORIES,
    ]);
  });

  it("links All to the unfiltered gallery", () => {
    expect(templateFilters(null)[0]?.href).toBe("/templates");
  });

  it("encodes category names that contain spaces", () => {
    const smallBusiness = templateFilters(null).find(
      (filter) => filter.label === "Small business",
    );
    expect(smallBusiness?.href).toBe("/templates?category=Small%20business");
  });

  it("round-trips every link back to its category", () => {
    for (const filter of templateFilters(null).slice(1)) {
      const value = new URL(filter.href, "http://localhost").searchParams.get(
        "category",
      );
      expect(templateCategoryFrom(value)).toBe(filter.label);
    }
  });

  it("marks only the selected category", () => {
    const selected = templateFilters("Travel").filter((f) => f.selected);
    expect(selected.map((filter) => filter.label)).toEqual(["Travel"]);
  });

  it("marks All when no category is selected", () => {
    const selected = templateFilters(null).filter((f) => f.selected);
    expect(selected.map((filter) => filter.label)).toEqual(["All"]);
  });
});

describe("TEMPLATE_CATEGORIES", () => {
  it("lists exactly the categories the templates use, so no filter is empty", () => {
    const used = new Set(
      PROFILE_TEMPLATES.map((template) => template.category),
    );
    expect([...TEMPLATE_CATEGORIES].sort()).toEqual([...used].sort());
  });
});
