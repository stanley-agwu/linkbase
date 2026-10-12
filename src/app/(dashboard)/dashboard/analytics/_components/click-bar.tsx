type ClickBarProps = {
  label: string;
  value: string;
  /** Fill width, 0–100. */
  pct: number;
  /** De-emphasises the row, e.g. a hidden link. */
  muted?: boolean;
};

/**
 * An analytics row (ui.md §1.24): label and value as text, with a bar under
 * them. The value is in the text, so the bar is decorative.
 */
export function ClickBar({ label, value, pct, muted = false }: ClickBarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span
          className={`min-w-0 truncate font-medium ${muted ? "text-muted" : "text-strong"}`}
        >
          {label}
        </span>
        <span className="shrink-0 text-muted tabular-nums">{value}</span>
      </div>
      <div aria-hidden="true" className="h-1.5 rounded-[3px] bg-surface-soft">
        <div
          className="h-full rounded-[3px] bg-ember-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
