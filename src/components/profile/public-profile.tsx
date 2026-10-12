import Link from "next/link";

import type { PublicPage } from "@/lib/types";

import { Portrait } from "./portrait";
import { ProfileLink } from "./profile-link";
import { resolveTheme } from "./resolve-theme";
import { TEMPLATE_FONT_VARIABLES } from "./template-fonts";

/**
 * A public profile page (ui.md §2.5): styled entirely by the owner's theme,
 * set inline because it's runtime data. No Linkbase chrome beyond the
 * "Made with linkbase" mark.
 */
export function PublicProfile({ page }: { page: PublicPage }) {
  const theme = resolveTheme(page);
  const name = page.displayName ?? `@${page.username}`;

  return (
    <main
      className={`flex min-h-dvh flex-col items-center px-5 pt-[clamp(64px,10vh,96px)] pb-16 ${TEMPLATE_FONT_VARIABLES}`}
      style={{ background: theme.bg, color: theme.fg, fontFamily: theme.font }}
    >
      <div className="flex w-full max-w-[580px] flex-col items-center gap-3">
        <div
          className="rounded-full"
          style={{ border: `4px solid ${theme.btnBg}` }}
        >
          <Portrait name={name} bg={theme.avatar} fg={theme.btnBg} size={104} />
        </div>
        <h1 className="m-0 mt-3 text-center text-[clamp(26px,4vw,32px)] font-bold tracking-[-0.02em]">
          {name}
        </h1>
        {page.bio ? (
          <p className="m-0 max-w-[420px] text-center text-md leading-normal text-pretty opacity-85">
            {page.bio}
          </p>
        ) : null}

        {page.links.length > 0 ? (
          <ul className="m-0 mt-6 flex w-full list-none flex-col gap-3 p-0">
            {page.links.map((link) => (
              <li key={link.id}>
                <ProfileLink theme={theme} href={link.url}>
                  {link.title}
                </ProfileLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 mt-6 text-center text-md opacity-70">
            No links yet.
          </p>
        )}

        <Link
          href="/"
          className="mt-14 inline-flex min-h-11 items-center rounded-full px-4.5 text-[13px] font-semibold opacity-80 hover:opacity-100"
          style={{
            border: `1px solid ${theme.fg}`,
            color: theme.fg,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          Made with linkbase
        </Link>
      </div>
    </main>
  );
}
