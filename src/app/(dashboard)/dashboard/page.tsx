import type { Metadata } from "next";

import { Portrait } from "@/components/profile/portrait";
import { SocialIcons } from "@/components/profile/social-icons";
import { SOON_CLASS, SoonTag } from "@/components/ui/soon-tag";
import { requireUsername } from "@/lib/auth";
import { countRecentClicks, getProfileSettings, listLinks } from "@/lib/db";
import { getPublicProfileUrl } from "@/lib/public-url";

import { AddLinkDialog } from "./_components/add-link-dialog";
import { AnalyticsCard } from "./_components/analytics-card";
import { DashboardHeader } from "./_components/dashboard-header";
import { EditProfileDialog } from "./_components/edit-profile-dialog";
import { LinkList } from "./_components/link-list";

export const metadata: Metadata = { title: "My linkbase" };

const WEEK_DAYS = 7;

/**
 * The link editor (ui.md §2.4): header, analytics, profile, and links. The
 * live preview beside it comes from the layout. Controls without a feature
 * yet render disabled with a "Soon" tag.
 */
export default async function DashboardPage() {
  // The page checks identity and onboarding itself; the proxy is only a
  // pre-filter. listLinks and getProfileSettings are shared with the layout
  // through cache(), so they cost no extra query.
  const { userId, username } = await requireUsername();
  const [links, profile, clicksThisWeek, publicUrl] = await Promise.all([
    listLinks(userId),
    getProfileSettings(userId),
    countRecentClicks(userId, WEEK_DAYS),
    getPublicProfileUrl(username),
  ]);
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const name = profile.displayName ?? username;

  return (
    <>
      <DashboardHeader title="My linkbase" publicUrl={publicUrl} />

      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-[clamp(20px,4vw,48px)] pt-8 pb-28 lg:pb-12">
        <AnalyticsCard
          clicksThisWeek={clicksThisWeek}
          totalClicks={totalClicks}
        />

        <section
          aria-label="Profile"
          className="flex items-center gap-4 sm:gap-5"
        >
          <div className="shrink-0 rounded-full border-3 border-ember-500">
            <Portrait name={name} size={72} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="m-0 truncate font-display text-[22px] font-extrabold tracking-[-0.02em]">
              {name}
            </h2>
            {profile.bio ? (
              <p className="m-0 text-sm text-pretty text-secondary">
                {profile.bio}
              </p>
            ) : (
              <p className="m-0 text-sm text-muted">
                Add a bio from the … menu.
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2 opacity-40">
              <SocialIcons
                networks={["instagram", "youtube", "tiktok", "x"]}
                size={18}
                gap={12}
              />
              <SoonTag />
            </div>
          </div>
          <EditProfileDialog
            username={username}
            displayName={profile.displayName}
            bio={profile.bio}
          />
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
    </>
  );
}
