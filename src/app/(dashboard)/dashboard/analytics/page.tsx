import type { Metadata } from "next";

import { StatCard } from "@/components/marketing/stat-card";
import { Chip } from "@/components/ui/chip";
import { SoonTag } from "@/components/ui/soon-tag";
import { requireUsername } from "@/lib/auth";
import { getClickAnalytics } from "@/lib/db";
import { getPublicProfileUrl } from "@/lib/public-url";
import type { AnalyticsRange } from "@/lib/types";
import { ANALYTICS_RANGES, analyticsRangeSchema } from "@/lib/validation";

import { DashboardHeader } from "../_components/dashboard-header";

import { ClickBar } from "./_components/click-bar";
import { ClickChart } from "./_components/click-chart";

export const metadata: Metadata = { title: "Analytics" };

const RANGES: Record<AnalyticsRange, { chip: string; note: string }> = {
  "7d": { chip: "7 days", note: "Last 7 days, by day." },
  "30d": { chip: "30 days", note: "Last 30 days, by day." },
  "90d": { chip: "90 days", note: "Last 90 days, by week." },
};

const count = new Intl.NumberFormat("en");

/**
 * Clicks for the selected range (the "Dashboard — analytics" mockup). Only
 * clicks are tracked, so Views, Click rate and Top sources show as Soon.
 * Days are UTC.
 */
export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/dashboard/analytics">) {
  const [{ userId, username }, { range: rawRange }] = await Promise.all([
    requireUsername(),
    searchParams,
  ]);
  const range = analyticsRangeSchema.parse(rawRange);
  const [analytics, publicUrl] = await Promise.all([
    getClickAnalytics(userId, range),
    getPublicProfileUrl(username),
  ]);
  const liveLinks = analytics.links.filter((link) => link.visible).length;
  const busiest = Math.max(1, ...analytics.links.map((link) => link.count));

  return (
    <>
      <DashboardHeader title="Analytics" publicUrl={publicUrl} />

      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-[clamp(20px,4vw,48px)] pt-8 pb-28 lg:pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="m-0 text-[15px] text-muted">
            {RANGES[range].note} Times are in UTC.
          </p>
          <nav aria-label="Date range" className="flex gap-1.5">
            {ANALYTICS_RANGES.map((option) => (
              <Chip
                key={option}
                href={`/dashboard/analytics?range=${option}`}
                selected={option === range}
              >
                {RANGES[option].chip}
              </Chip>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Views" value="—" />
          <StatCard label="Clicks" value={count.format(analytics.total)} />
          <StatCard label="Click rate" value="—" />
          <StatCard label="Live links" value={count.format(liveLinks)} />
        </div>
        <p className="-mt-3 m-0 flex items-center gap-2 text-sm text-muted">
          Views and click rate need page-view tracking. <SoonTag />
        </p>

        <ClickChart buckets={analytics.buckets} peak={analytics.peak} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3">
          <section
            aria-labelledby="by-link-heading"
            className="flex flex-col gap-3.5 rounded-md border border-subtle bg-surface-card p-5"
          >
            <h2
              id="by-link-heading"
              className="m-0 font-mono text-xs font-normal tracking-widest text-muted uppercase"
            >
              Clicks by link
            </h2>
            {analytics.links.length > 0 ? (
              analytics.links.map((link) => (
                <ClickBar
                  key={link.id}
                  label={link.visible ? link.title : `${link.title} (hidden)`}
                  value={count.format(link.count)}
                  pct={(link.count / busiest) * 100}
                  muted={!link.visible}
                />
              ))
            ) : (
              <p className="m-0 text-sm text-muted">No links yet.</p>
            )}
          </section>

          <section
            aria-labelledby="sources-heading"
            className="flex flex-col gap-3.5 rounded-md border border-subtle bg-surface-card p-5"
          >
            <h2
              id="sources-heading"
              className="m-0 flex items-center gap-2 font-mono text-xs font-normal tracking-widest text-muted uppercase"
            >
              Top sources <SoonTag />
            </h2>
            <p className="m-0 text-sm text-muted">
              Where your visitors come from — Instagram, TikTok, direct — once
              page views are tracked.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
