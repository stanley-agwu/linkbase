"use client";

import { useState } from "react";
import Link from "next/link";

type BannerProps = {
  children: React.ReactNode;
  linkLabel?: string;
  linkHref?: string;
};

/** Dismissible announcement strip above the nav. Dismissal isn't persisted. */
export function Banner({ children, linkLabel, linkHref }: BannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative bg-surface-inverse px-12 py-3 text-center text-sm text-on-inverse">
      {children}
      {linkLabel && linkHref && (
        <>
          {" "}
          <Link
            href={linkHref}
            className="font-semibold underline hover:text-on-inverse hover:opacity-85"
          >
            {linkLabel}
          </Link>
        </>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
        className="absolute top-1/2 right-4 size-8 -translate-y-1/2 cursor-pointer text-lg"
      >
        ×
      </button>
    </div>
  );
}
