import type { DashboardLink } from "@/lib/types";

import { LinkRow } from "./link-row";

/** The user's links in display order. Rows are the interactive part. */
export function LinkList({ links }: { links: DashboardLink[] }) {
  return (
    <ul
      aria-label="Your links"
      className="m-0 flex list-none flex-col gap-3 p-0"
    >
      {links.map((link, index) => (
        <li key={link.id}>
          <LinkRow
            link={link}
            first={index === 0}
            last={index === links.length - 1}
          />
        </li>
      ))}
    </ul>
  );
}
