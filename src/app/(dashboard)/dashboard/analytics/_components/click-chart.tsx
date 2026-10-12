import type { ClickBucket } from "@/lib/types";

type ClickChartProps = {
  buckets: ClickBucket[];
  peak: ClickBucket | null;
};

const count = new Intl.NumberFormat("en");

function clicksLabel(value: number): string {
  return `${count.format(value)} ${value === 1 ? "click" : "clicks"}`;
}

/**
 * Clicks over the range as bars, one per bucket. Server-rendered, no chart
 * library. One series, so no legend: the heading names it. Hovering a column
 * shows its count; the same numbers are in the table below for keyboard and
 * screen-reader users, and because the ember bars sit under 3:1 contrast
 * against the card.
 */
export function ClickChart({ buckets, peak }: ClickChartProps) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const gap =
    buckets.length > 20
      ? "gap-0.5"
      : buckets.length > 10
        ? "gap-1.5"
        : "gap-2.5";

  return (
    <section
      aria-labelledby="clicks-heading"
      className="flex flex-col gap-4 rounded-md border border-subtle bg-surface-card p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="clicks-heading"
          className="m-0 font-mono text-xs font-normal tracking-widest text-muted uppercase"
        >
          Clicks
        </h2>
        <span className="font-mono text-xs text-muted">
          {peak ? `Peak ${count.format(peak.count)} · ${peak.fullLabel}` : null}
        </span>
      </div>

      {peak ? (
        <>
          <div aria-hidden="true" className="flex flex-col gap-2">
            <div
              className={`flex h-50 items-end border-b border-subtle ${gap}`}
            >
              {buckets.map((bucket) => {
                const pct = (bucket.count / max) * 100;
                return (
                  // The whole column is the hover target, not just the bar.
                  <div
                    key={bucket.start}
                    className="group relative flex h-full min-w-0 flex-1 items-end"
                  >
                    <div
                      className="w-full rounded-t-[4px] bg-ember-500 group-hover:opacity-80"
                      style={{
                        height: bucket.count > 0 ? `max(${pct}%, 2px)` : 0,
                      }}
                    />
                    <span
                      className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-sm bg-surface-inverse px-2 py-1 text-xs whitespace-nowrap text-on-inverse group-hover:block"
                      style={{ bottom: `calc(${pct}% + 6px)` }}
                    >
                      {clicksLabel(bucket.count)} · {bucket.fullLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={`flex ${gap}`}>
              {buckets.map((bucket) => (
                <span
                  key={bucket.start}
                  className="min-w-0 flex-1 overflow-visible text-center font-mono text-[11px] whitespace-nowrap text-muted"
                >
                  {bucket.label}
                </span>
              ))}
            </div>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer rounded-sm font-semibold text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500">
              Show as table
            </summary>
            <table className="mt-3 w-full border-collapse text-left">
              <caption className="sr-only">Clicks per period</caption>
              <thead>
                <tr className="border-b border-subtle text-muted">
                  <th scope="col" className="py-1.5 font-medium">
                    Period
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((bucket) => (
                  <tr key={bucket.start} className="border-b border-subtle">
                    <th scope="row" className="py-1.5 font-normal">
                      {bucket.fullLabel}
                    </th>
                    <td className="py-1.5 text-right tabular-nums">
                      {count.format(bucket.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="m-0 rounded-md border border-dashed border-default py-10 text-center text-md text-muted">
          No clicks yet in this range.
        </p>
      )}
    </section>
  );
}
