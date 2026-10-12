"use client";

import { useOptimistic, useState, useTransition } from "react";

import { PROFILE_TEMPLATES } from "@/components/profile/templates";
import { ThemeSwatch } from "@/components/profile/theme-swatch";
import { Chip } from "@/components/ui/chip";
import type { Appearance, ButtonShape, ProfileFont } from "@/lib/types";

import { updateAppearance } from "../_actions";

const SHAPES: { value: ButtonShape; label: string }[] = [
  { value: "template", label: "Template" },
  { value: "square", label: "Square" },
  { value: "soft", label: "Soft" },
  { value: "pill", label: "Pill" },
];

const FONTS: { value: ProfileFont; label: string }[] = [
  { value: "template", label: "Template" },
  { value: "dm-sans", label: "DM Sans" },
  { value: "bricolage", label: "Bricolage" },
  { value: "mono", label: "Mono" },
];

const GROUP_LABEL =
  "m-0 font-mono text-xs tracking-widest text-muted uppercase";

/**
 * Theme, button shape and font. Each pick shows at once (optimistically) and
 * saves straight away; the server's refresh then redraws the live preview.
 */
export function AppearanceForm({ appearance }: { appearance: Appearance }) {
  const [optimistic, setOptimistic] = useOptimistic(
    appearance,
    (current, patch: Partial<Appearance>) => ({ ...current, ...patch }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(patch: Partial<Appearance>) {
    setError(null);
    startTransition(async () => {
      setOptimistic(patch);
      const result = await updateAppearance(patch);
      if (result.status === "error") {
        setError(result.formError ?? "That choice couldn’t be saved.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="m-0 text-[15px] text-muted">
        Changes show on your page as soon as you make them.
      </p>

      <section aria-labelledby="theme-label" className="flex flex-col gap-3.5">
        <h2 id="theme-label" className={GROUP_LABEL}>
          Theme
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="theme-label"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,130px),1fr))] gap-3"
        >
          {PROFILE_TEMPLATES.map((template) => (
            <ThemeSwatch
              key={template.id}
              theme={template}
              selected={optimistic.themeId === template.id}
              onSelect={() => save({ themeId: template.id })}
            />
          ))}
        </div>
      </section>

      <ChoiceGroup
        id="shape-label"
        label="Button shape"
        options={SHAPES}
        value={optimistic.buttonShape}
        onChange={(buttonShape) => save({ buttonShape })}
      />

      <ChoiceGroup
        id="font-label"
        label="Font"
        options={FONTS}
        value={optimistic.font}
        onChange={(font) => save({ font })}
      />

      <p role="status" className="m-0 min-h-5 text-sm text-status-error">
        {error}
      </p>
    </div>
  );
}

type ChoiceGroupProps<TValue extends string> = {
  id: string;
  label: string;
  options: { value: TValue; label: string }[];
  value: TValue;
  onChange: (value: TValue) => void;
};

function ChoiceGroup<TValue extends string>({
  id,
  label,
  options,
  value,
  onChange,
}: ChoiceGroupProps<TValue>) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5">
      <h2 id={id} className={GROUP_LABEL}>
        {label}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <Chip
            key={option.value}
            role="radio"
            aria-checked={value === option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}
