import Link from "next/link";

type ChipProps = Omit<React.ComponentProps<"button">, "children"> & {
  selected?: boolean;
  /** Full width, left-aligned: the sidebar category list. */
  block?: boolean;
  /** Renders a link (a filter that navigates) instead of a button. */
  href?: string;
  children: React.ReactNode;
};

const BASE =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border text-[15px] font-medium transition-colors duration-180 ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

/**
 * A selectable pill for filters and single-choice groups (ui.md §1.6). As a
 * button it reports `aria-pressed` unless the caller gives it another role
 * (e.g. `radio` with `aria-checked`); as a link, `aria-current`.
 */
export function Chip({
  selected = false,
  block = false,
  href,
  className = "",
  children,
  ...buttonProps
}: ChipProps) {
  const classes = [
    BASE,
    block
      ? "w-full justify-start px-[18px] py-3 text-left"
      : "justify-center px-4 py-[11px]",
    selected
      ? "border-ink-900 bg-ink-900 text-cream-150 hover:text-cream-150"
      : "border-default bg-transparent text-strong hover:bg-surface-soft hover:text-strong",
    className,
  ].join(" ");

  if (href) {
    return (
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={classes}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={buttonProps.role ? undefined : selected}
      className={classes}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
