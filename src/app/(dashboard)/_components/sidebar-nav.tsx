"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "My linkbase", href: "/dashboard" },
  { label: "Appearance", href: "/dashboard/appearance" },
] as const;

type SidebarNavProps = {
  /** Shared with the sidebar's "Soon" rows so both line up. */
  itemClassName: string;
};

/** The sidebar entries with a page behind them, marking the current one. */
export function SidebarNav({ itemClassName }: SidebarNavProps) {
  const pathname = usePathname();

  return ITEMS.map(({ label, href }) => {
    const current = pathname === href;
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={current ? "page" : undefined}
          className={`${itemClassName} text-strong hover:bg-surface-soft hover:text-strong ${current ? "bg-surface-soft font-semibold" : "font-medium"}`}
        >
          {label}
        </Link>
      </li>
    );
  });
}
