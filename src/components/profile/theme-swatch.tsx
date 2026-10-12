import type { ProfileTemplate } from "@/lib/types";

type ThemeSwatchProps = {
  theme: ProfileTemplate;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

/**
 * A theme picker tile (ui.md §1.23): the theme's background with two of its
 * buttons, and its name. One radio in a `role="radiogroup"` the caller
 * renders.
 */
export function ThemeSwatch({
  theme,
  selected,
  onSelect,
  disabled,
}: ThemeSwatchProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={`flex cursor-pointer flex-col gap-2 rounded-[18px] border-2 bg-surface-card p-1.5 text-left transition-colors duration-180 ease-brand hover:border-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 disabled:cursor-default ${selected ? "border-ember-500 hover:border-ember-500" : "border-transparent"}`}
    >
      <span
        aria-hidden="true"
        className="flex h-24 flex-col justify-center gap-1.5 rounded-[14px] px-4.5"
        style={{ background: theme.bg }}
      >
        {[0, 1].map((bar) => (
          <span
            key={bar}
            className="h-3.5"
            style={{
              background: theme.btnBg,
              border: `1.5px solid ${theme.btnBorder ?? theme.btnBg}`,
              borderRadius: theme.radius,
            }}
          />
        ))}
      </span>
      <span className="px-1.5 pb-1 text-sm font-semibold text-strong">
        {theme.name}
      </span>
    </button>
  );
}
