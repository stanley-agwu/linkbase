import Link from "next/link";

import { ProfilePhone } from "@/components/profile/profile-phone";
import { resolveTheme } from "@/components/profile/resolve-theme";
import { TEMPLATE_FONT_VARIABLES } from "@/components/profile/template-fonts";
import type { DashboardLink, ProfileSettings } from "@/lib/types";

type LivePreviewProps = {
  username: string;
  profile: ProfileSettings;
  links: DashboardLink[];
};

/**
 * What visitors will see: the owner's theme, name and bio, and the visible
 * links in order. Rendered on the server from the same reads as the pages,
 * so every action's refresh() updates it.
 */
export function LivePreview({ username, profile, links }: LivePreviewProps) {
  return (
    <div
      className={`flex w-full max-w-[290px] flex-col items-center gap-4 ${TEMPLATE_FONT_VARIABLES}`}
    >
      <p className="m-0 font-mono text-xs tracking-widest text-muted uppercase">
        Live preview
      </p>
      <ProfilePhone
        framed
        social={false}
        theme={resolveTheme(profile)}
        name={profile.displayName ?? `@${username}`}
        bio={profile.bio ?? ""}
        links={links.filter((link) => link.visible).map((link) => link.title)}
      />
      <Link
        href={`/user/${username}`}
        target="_blank"
        className="font-mono text-sm text-strong"
      >
        /user/{username} <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
