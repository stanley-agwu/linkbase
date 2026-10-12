import { ProfilePhone } from "@/components/profile/profile-phone";
import { PROFILE_TEMPLATES } from "@/components/profile/templates";
import type { DashboardLink } from "@/lib/types";

// Kiln is closest to the mockup. Replaced by the user's own theme once
// Appearance exists.
const PREVIEW_THEME = PROFILE_TEMPLATES[0];

type LivePreviewProps = {
  username: string;
  links: DashboardLink[];
};

/**
 * What visitors will see: the visible links, in order. Rendered on the
 * server from the same read as the list, so every action's refresh() updates
 * both.
 */
export function LivePreview({ username, links }: LivePreviewProps) {
  return (
    <div className="flex w-full max-w-[290px] flex-col items-center gap-4">
      <p className="m-0 font-mono text-xs tracking-widest text-muted uppercase">
        Live preview
      </p>
      <ProfilePhone
        framed
        social={false}
        theme={PREVIEW_THEME}
        name={username}
        bio=""
        links={links.filter((link) => link.visible).map((link) => link.title)}
      />
      {/* Plain text until /user/[handle] exists. */}
      <p className="m-0 font-mono text-sm text-strong">
        linkbase.me/{username}
      </p>
    </div>
  );
}
