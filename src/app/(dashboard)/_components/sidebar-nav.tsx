"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarNavProps = {
  /** Sidebar entries with a page behind them, in the order shown. */
  items: { label: string; href: string }[];
  /** Shared with the sidebar's "Soon" rows so both line up. */
  itemClassName: string;
};

/**
 * Sidebar entries that link somewhere, marking the current one. Rendered in
 * runs between the "Soon" rows so the mockup's order holds.
 */
export function SidebarNav({ items, itemClassName }: SidebarNavProps) {
  const pathname = usePathname();

  return items.map(({ label, href }) => {
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
