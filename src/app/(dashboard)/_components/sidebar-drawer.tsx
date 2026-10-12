"use client";

import { useRef } from "react";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";

/**
 * Places the sidebar: a sticky column from `lg` up, and below that a top bar
 * whose menu button opens the same content as a modal drawer. A native
 * `<dialog>` gives the drawer focus trapping and Escape for free.
 */
export function SidebarDrawer({ children }: { children: React.ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null);

  function close() {
    drawer.current?.close();
  }

  function handleClick(event: React.MouseEvent<HTMLDialogElement>) {
    // A click on the backdrop lands on the dialog itself; following a link
    // should close it too.
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) close();
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col border-r border-subtle bg-surface-card px-3 py-5 lg:flex">
        {children}
      </aside>

      <div className="flex items-center gap-3 border-b border-subtle bg-surface-card px-4 py-2 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => drawer.current?.showModal()}
          className="grid size-11 place-items-center rounded-full text-xl text-strong hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link href="/dashboard" aria-label="Linkbase dashboard">
          <Logo size={20} />
        </Link>
      </div>

      <dialog
        ref={drawer}
        aria-label="Menu"
        onClick={handleClick}
        className="m-0 h-dvh max-h-none w-[min(300px,85vw)] border-r border-subtle bg-surface-card p-0 text-strong backdrop:bg-ink-900/40 lg:hidden"
      >
        <div className="flex h-full flex-col px-3 py-5">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="mb-2 grid size-11 place-items-center self-end rounded-full text-lg text-muted hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
          >
            <span aria-hidden="true">×</span>
          </button>
          {children}
        </div>
      </dialog>
    </>
  );
}
