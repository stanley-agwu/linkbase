import { requireUsername } from "@/lib/auth";
import { getProfileSettings, listLinks } from "@/lib/db";

import { LivePreview } from "./_components/live-preview";
import { PreviewDialog } from "./_components/preview-dialog";

/**
 * Shared by My linkbase, Appearance and (later) Analytics: the page column,
 * and the live preview beside it from `lg` up (a floating Preview button
 * below). Checks identity itself, like every page (auth.md §3).
 */
export default async function DashboardSectionLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const { userId, username } = await requireUsername();
  const [links, profile] = await Promise.all([
    listLinks(userId),
    getProfileSettings(userId),
  ]);
  const preview = (
    <LivePreview username={username} profile={profile} links={links} />
  );

  return (
    <div className="flex flex-1">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>

      <aside
        aria-label="Live preview"
        className="sticky top-0 hidden h-dvh w-[clamp(320px,26vw,400px)] shrink-0 items-center justify-center border-l border-subtle bg-surface-soft px-6 lg:flex"
      >
        {preview}
      </aside>
      <PreviewDialog publicHref={`/user/${username}`}>{preview}</PreviewDialog>
    </div>
  );
}
