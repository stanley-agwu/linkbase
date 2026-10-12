"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logOut } from "@/lib/auth/actions";

type UserMenuProps = {
  user: { name: string | null; email: string };
  /** `sidebar` stretches the trigger and drops the menu below it, full width. */
  placement?: "header" | "sidebar";
};

const ITEM_CLASS =
  "flex min-h-11 w-full cursor-pointer items-center rounded-md px-3 text-left text-nav font-medium text-strong hover:bg-surface-soft hover:text-strong focus-visible:bg-surface-soft focus-visible:outline-none";

/**
 * The signed-in account in the header: an avatar button that opens a menu
 * with the account, Dashboard, and Log out. Menu-button pattern: Escape and
 * outside clicks close it, arrow keys move between items.
 */
export function UserMenu({ user, placement = "header" }: UserMenuProps) {
  const sidebar = placement === "sidebar";
  const pathname = usePathname();
  // Remembers the path the menu was opened on, so navigating closes it
  // without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const label = user.name ?? user.email;
  const initial = label.charAt(0).toUpperCase();

  function close({ restoreFocus }: { restoreFocus: boolean }) {
    setOpenOn(null);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function menuItems(): HTMLElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
  }

  // Focus the first item when the menu opens (menu-button pattern).
  useEffect(() => {
    if (open) menuItems()[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close({ restoreFocus: false });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = menuItems();
    const index = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close({ restoreFocus: true });
        break;
      case "ArrowDown":
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Tab":
        close({ restoreFocus: false });
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${label}`}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 ${sidebar ? "w-full" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`flex size-9 items-center justify-center rounded-full font-display text-md font-bold ${sidebar ? "bg-action-primary text-on-accent" : "bg-action-dark text-on-inverse"}`}
        >
          {initial}
        </span>
        <span
          className={`truncate text-nav font-medium text-strong ${sidebar ? "flex-1 text-left" : "max-w-40 max-[639px]:hidden"}`}
        >
          {label}
        </span>
        <span aria-hidden="true" className="text-xs text-muted">
          ▾
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full z-30 mt-2 flex flex-col gap-1 rounded-input border border-subtle bg-surface-card p-2 shadow-nav ${sidebar ? "inset-x-0" : "right-0 w-64"}`}
        >
          <div className="border-b border-subtle px-3 pt-1 pb-3">
            {user.name ? (
              <p className="m-0 truncate text-nav font-semibold text-strong">
                {user.name}
              </p>
            ) : null}
            <p className="m-0 truncate text-sm text-muted">{user.email}</p>
          </div>
          <Link
            href="/dashboard"
            role="menuitem"
            tabIndex={-1}
            onClick={() => close({ restoreFocus: false })}
            className={ITEM_CLASS}
          >
            Dashboard
          </Link>
          <form action={logOut}>
            <button
              type="submit"
              role="menuitem"
              tabIndex={-1}
              className={ITEM_CLASS}
            >
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
