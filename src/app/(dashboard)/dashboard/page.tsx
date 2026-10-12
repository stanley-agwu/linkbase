import type { Metadata } from "next";

import { Portrait } from "@/components/profile/portrait";
import { SocialIcons } from "@/components/profile/social-icons";
import { Button } from "@/components/ui/button";
import { SOON_CLASS, SoonTag } from "@/components/ui/soon-tag";
import { requireUsername } from "@/lib/auth";
import { countRecentClicks, listLinks } from "@/lib/db";

import { AddLinkDialog } from "./_components/add-link-dialog";
import { AnalyticsCard } from "./_components/analytics-card";
import { LinkList } from "./_components/link-list";
import { LivePreview } from "./_components/live-preview";
import { PreviewDialog } from "./_components/preview-dialog";
import { ShareButton } from "./_components/share-button";

export const metadata: Metadata = { title: "My linkbase" };

const WEEK_DAYS = 7;

/**
 * The link editor (ui.md §2.4): header, analytics, profile, links, and the
 * live preview beside them (a floating Preview button below `lg`). Controls
 * without a feature yet render disabled with a "Soon" tag.
 */
export default async function DashboardPage() {
  // The page checks identity and onboarding itself; the proxy is only a
  // pre-filter.
  const { userId, username } = await requireUsername();
  const [links, clicksThisWeek] = await Promise.all([
    listLinks(userId),
    countRecentClicks(userId, WEEK_DAYS),
  ]);
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const preview = <LivePreview username={username} links={links} />;

  return (
    <div className="flex flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-subtle bg-surface-card px-[clamp(20px,3vw,36px)] py-3.5">
          <h1 className="m-0 font-display text-2xl font-extrabold tracking-[-0.02em]">
            My linkbase
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              size="sm"
              disabled
              className="gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Theme <SoonTag />
            </Button>
            <ShareButton url={`https://linkbase.me/${username}`} />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-[clamp(20px,4vw,48px)] pt-8 pb-28 lg:pb-12">
          <AnalyticsCard
            clicksThisWeek={clicksThisWeek}
            totalClicks={totalClicks}
          />

          <section
            aria-label="Profile"
            className="flex items-center gap-4 sm:gap-5"
          >
            <Portrait name={username} size={80} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h2 className="m-0 truncate font-display text-[22px] font-extrabold tracking-[-0.02em]">
                {username}
              </h2>
              <p
                aria-disabled="true"
                className={`m-0 flex items-center gap-2 text-sm ${SOON_CLASS}`}
              >
                Add a bio <SoonTag />
              </p>
              <div className="opacity-40">
                <SocialIcons
                  networks={["instagram", "youtube", "tiktok", "x"]}
                  size={18}
                  gap={12}
                />
              </div>
            </div>
            <button
              type="button"
              disabled
              aria-label="Profile options (coming soon)"
              className="grid size-11 shrink-0 cursor-not-allowed place-items-center rounded-full border border-subtle bg-surface-card text-muted"
            >
              <span aria-hidden="true">…</span>
            </button>
          </section>

          <AddLinkDialog />

          <div className="flex items-center justify-between gap-4 text-sm font-semibold">
            <span
              aria-disabled="true"
              className={`flex items-center gap-2 ${SOON_CLASS}`}
            >
              + Add collection <SoonTag />
            </span>
            <span
              aria-disabled="true"
              className={`flex items-center gap-2 ${SOON_CLASS}`}
            >
              View archive → <SoonTag />
            </span>
          </div>

          <section aria-label="Links">
            {links.length > 0 ? (
              <LinkList links={links} />
            ) : (
              <p className="m-0 rounded-md border border-dashed border-default py-10 text-center text-md text-muted">
                No links yet. Add your first one.
              </p>
            )}
          </section>
        </main>
      </div>

      <aside
        aria-label="Live preview"
        className="sticky top-0 hidden h-dvh w-[clamp(320px,26vw,400px)] shrink-0 items-center justify-center border-l border-subtle bg-page px-6 lg:flex"
      >
        {preview}
      </aside>
      <PreviewDialog>{preview}</PreviewDialog>
    </div>
  );
}
