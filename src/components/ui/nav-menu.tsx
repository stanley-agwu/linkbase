"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { Button, ButtonLink } from "./button";

type NavMenuProps = {
  logo: React.ReactNode;
  links: { label: string; href: string }[];
};

/**
 * The compact nav used below 1100px: logo, Log in (hidden under 640px), Sign
 * up, and a Menu button that opens a drawer with the full link list.
 */
export function NavMenu({ logo, links }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  function close() {
    setOpen(false);
  }

  return (
    <header className="sticky top-3 z-20 mt-3 px-4 min-[1100px]:hidden">
      <nav
        aria-label="Main"
        className="flex items-center gap-2 rounded-full border border-subtle bg-surface-card py-2 pr-2 pl-5 shadow-nav"
      >
        <Link
          href="/"
          aria-label="Linkbase home"
          className="flex min-h-11 flex-1 items-center"
        >
          {logo}
        </Link>
        <ButtonLink href="/login" variant="soft" className="max-[639px]:hidden">
          Log in
        </ButtonLink>
        <ButtonLink href="/signup" variant="dark">
          <span className="max-[639px]:hidden">Sign up free</span>
          <span className="min-[640px]:hidden">Sign up</span>
        </ButtonLink>
        <Button
          variant="outline"
          aria-expanded={open}
          aria-controls={drawerId}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          {open ? "Close" : "Menu"}
        </Button>
      </nav>
      {open && (
        <div
          id={drawerId}
          className="mt-2 flex flex-col rounded-card border border-subtle bg-surface-card px-6 pt-3 pb-6 shadow-nav"
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={close}
              className="flex items-center justify-between border-b border-subtle py-3.5 font-display text-[32px] font-extrabold tracking-[-0.03em]"
            >
              {link.label}
              <span
                aria-hidden="true"
                className="font-sans text-title font-normal text-muted"
              >
                →
              </span>
            </Link>
          ))}
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink
              href="/login"
              variant="soft"
              fullWidth
              className="flex-[1_1_140px]"
            >
              Log in
            </ButtonLink>
            <ButtonLink
              href="/signup"
              variant="dark"
              fullWidth
              className="flex-[1_1_140px]"
            >
              Sign up free
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
