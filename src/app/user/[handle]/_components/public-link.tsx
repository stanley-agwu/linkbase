"use client";

import { ProfileLink } from "@/components/profile/profile-link";
import type { ProfileTheme } from "@/lib/types";

import { recordClick } from "../_actions";

type TrackedLinkProps = {
  linkId: string;
  href: string;
  theme: ProfileTheme;
  children: React.ReactNode;
};

/**
 * A public link that records the click on its way out. The link opens in a
 * new tab, so this page stays alive for the request; the `href` is the real
 * destination either way, so tracking can never break navigation.
 */
export function TrackedLink({
  linkId,
  href,
  theme,
  children,
}: TrackedLinkProps) {
  function record() {
    // Fire-and-forget: the action swallows its own failures.
    void recordClick(linkId);
  }

  return (
    <ProfileLink
      theme={theme}
      href={href}
      onClick={record}
      // Middle-click opens a tab without a click event.
      onAuxClick={(event) => {
        if (event.button === 1) record();
      }}
    >
      {children}
    </ProfileLink>
  );
}
