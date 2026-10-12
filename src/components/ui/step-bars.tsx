type StepBarsProps = {
  total: number;
  /** 1-based. */
  current: number;
};

/**
 * Segmented onboarding progress (ui.md §1.10), with the "Step N of M" label
 * it's always paired with.
 */
export function StepBars({ total, current }: StepBarsProps) {
  const label = `Step ${current} of ${total}`;

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-xs tracking-widest text-muted uppercase">
        {label}
      </span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1 rounded-[2px] ${index < current ? "bg-ember-500" : "bg-cream-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
