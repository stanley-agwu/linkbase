import { SOON_CLASS, SoonTag } from "@/components/ui/soon-tag";

type AnalyticsCardProps = {
  clicksThisWeek: number;
  totalClicks: number;
};

const count = new Intl.NumberFormat("en");

/**
 * The collapsible summary above the profile. A native `<details>`, so it
 * opens and closes without JavaScript. Views aren't tracked yet, so Views and
 * Click rate show "—".
 */
export function AnalyticsCard({
  clicksThisWeek,
  totalClicks,
}: AnalyticsCardProps) {
  return (
    <details
      open
      className="group rounded-md border border-subtle bg-surface-card p-5"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-xs tracking-widest text-muted uppercase">
          Analytics
        </span>
        <span className="text-body">
          {count.format(clicksThisWeek)}{" "}
          {clicksThisWeek === 1 ? "click" : "clicks"} this week
        </span>
        <span
          aria-hidden="true"
          className="ml-auto text-xs text-strong transition-transform group-open:rotate-0 -rotate-180"
        >
          ▲
        </span>
      </summary>

      <dl className="m-0 mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Stat label="Views" value="—" />
        <Stat label="Clicks" value={count.format(totalClicks)} />
        <Stat label="Click rate" value="—" />
      </dl>

      <p
        aria-disabled="true"
        className={`m-0 mt-4 flex items-center gap-2 text-sm font-semibold ${SOON_CLASS}`}
      >
        Open analytics →
        <SoonTag />
      </p>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-subtle bg-surface-card px-5 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="m-0 font-display text-[34px] leading-none font-extrabold tracking-[-0.03em] text-strong">
        {value}
      </dd>
    </div>
  );
}
