"use client";

type ToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Says what's switched, e.g. "Show “My site”" (ui.md §4.3). */
  label: string;
  disabled?: boolean;
};

/**
 * The ui.md §1.5 switch: 44×26, ember when on. The off track gets a border so
 * it clears 3:1 against the page (ui.md §4.1).
 */
export function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-6.5 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-180 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked
          ? "border-action-primary bg-action-primary"
          : "border-strong-border bg-cream-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 size-5 rounded-full bg-white transition-[left] duration-180 motion-reduce:transition-none ${
          checked ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}
