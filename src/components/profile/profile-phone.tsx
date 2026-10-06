import type { ProfileTheme } from "@/lib/types";

import { Portrait } from "./portrait";
import { ProfileLink } from "./profile-link";
import { SocialIcons } from "./social-icons";

type ProfilePhoneProps = {
  theme: ProfileTheme;
  name: string;
  bio: string;
  links: string[];
  /** Adds the ink bezel and phone shadow. */
  framed?: boolean;
  social?: boolean;
};

/** A miniature rendering of a public profile page, for previews. */
export function ProfilePhone({
  theme,
  name,
  bio,
  links,
  framed = false,
  social = true,
}: ProfilePhoneProps) {
  const screen = (
    <div
      className="flex aspect-9/17 w-full flex-col items-center gap-2 overflow-hidden rounded-screen px-4.5 pt-9 pb-5"
      style={{ background: theme.bg, color: theme.fg, fontFamily: theme.font }}
    >
      <div
        className="flex-none rounded-full"
        style={{ border: `3px solid ${theme.btnBg}` }}
      >
        <Portrait name={name} bg={theme.avatar} fg={theme.btnBg} size={62} />
      </div>
      <div className="mt-1.5 text-center text-[17px] font-bold tracking-[-0.01em]">
        {name}
      </div>
      <div className="text-center text-2xs leading-tight text-pretty opacity-82">
        {bio}
      </div>
      <div className="mt-3 flex w-full flex-col gap-2">
        {links.map((link) => (
          <ProfileLink key={link} theme={theme} size="sm">
            {link}
          </ProfileLink>
        ))}
      </div>
      {social && (
        <div className="mt-auto pt-3 opacity-85">
          <SocialIcons
            color={theme.fg}
            size={18}
            gap={10}
            networks={["instagram", "youtube", "tiktok"]}
          />
        </div>
      )}
    </div>
  );

  if (!framed) return screen;

  return (
    <div className="w-full rounded-[38px] bg-ink-900 p-2.5 shadow-phone">
      {screen}
    </div>
  );
}
