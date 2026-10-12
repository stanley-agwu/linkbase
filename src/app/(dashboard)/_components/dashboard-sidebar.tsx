import { UserMenu } from "@/components/auth/user-menu";
import { SOON_CLASS, SoonTag } from "@/components/ui/soon-tag";
import { verifySession } from "@/lib/auth";
import { logOut } from "@/lib/auth/actions";

import { SidebarDrawer } from "./sidebar-drawer";
import { SidebarNav } from "./sidebar-nav";

// In the mockup's order, after My linkbase and Appearance. None has a page
// yet, so each renders disabled.
const SECTIONS = ["Shop", "Earnings", "Audience", "Analytics"];
const TOOLS = [
  "Social planner",
  "Instagram auto-reply",
  "Link shortener",
  "Media kit",
];

const ITEM =
  "flex min-h-11 items-center justify-between gap-2 rounded-full px-3.5 text-nav";

/**
 * The dashboard's navigation. Reads only the session cookie, not the
 * database, so it's a convenience rather than a gate: pages check identity
 * themselves (auth.md §3).
 */
export async function DashboardSidebar() {
  const session = await verifySession();
  if (!session) return null;

  return (
    <SidebarDrawer>
      <UserMenu
        placement="sidebar"
        user={{ name: session.username ?? session.name, email: session.email }}
      />

      <nav aria-label="Dashboard" className="mt-4 flex flex-1 flex-col">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          <SidebarNav itemClassName={ITEM} />
          {SECTIONS.map((label) => (
            <SoonItem key={label} label={label} />
          ))}
        </ul>

        <h2 className="m-0 mt-6 mb-1 px-3.5 font-mono text-xs font-normal tracking-widest text-muted uppercase">
          Tools
        </h2>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {TOOLS.map((label) => (
            <SoonItem key={label} label={label} />
          ))}
        </ul>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 pt-6 text-sm">
          <span aria-disabled="true" className={SOON_CLASS}>
            Help
          </span>
          <span aria-disabled="true" className={SOON_CLASS}>
            What’s new
          </span>
          <form action={logOut}>
            <button
              type="submit"
              className="min-h-11 cursor-pointer text-sm text-body hover:text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>
    </SidebarDrawer>
  );
}

function SoonItem({ label }: { label: string }) {
  return (
    <li>
      <span
        aria-disabled="true"
        className={`${ITEM} font-medium ${SOON_CLASS}`}
      >
        {label}
        <SoonTag />
      </span>
    </li>
  );
}
