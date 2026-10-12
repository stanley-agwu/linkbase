"use client";

import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { ShareBar } from "@/components/ui/share-bar";

type DashboardHeaderProps = {
  title: string;
  /** The absolute public page address the Share strip copies. */
  publicUrl: string;
};

/**
 * The bar above every dashboard page: title, Theme (to Appearance) and Share,
 * which opens a strip with the page address to copy.
 */
export function DashboardHeader({ title, publicUrl }: DashboardHeaderProps) {
  const [sharing, setSharing] = useState(false);

  return (
    <div className="sticky top-0 z-10">
      <header className="flex min-h-16 items-center gap-2 border-b border-subtle bg-page px-[clamp(16px,3vw,32px)] py-2.5">
        <h1 className="m-0 flex-1 truncate font-display text-2xl font-extrabold tracking-[-0.02em]">
          {title}
        </h1>
        <ButtonLink
          href="/dashboard/appearance"
          variant="soft"
          size="sm"
          className="max-sm:hidden"
        >
          Theme
        </ButtonLink>
        <Button
          variant="dark"
          size="sm"
          aria-expanded={sharing}
          aria-controls="share-strip"
          onClick={() => setSharing((open) => !open)}
        >
          Share
        </Button>
      </header>
      {sharing ? (
        <div
          id="share-strip"
          className="flex flex-wrap items-center gap-3 border-b border-subtle bg-surface-card px-[clamp(16px,3vw,32px)] py-3.5"
        >
          <span className="flex-[1_1_200px] text-sm text-secondary">
            Your page is live. Paste this in every bio.
          </span>
          <ShareBar url={publicUrl} />
        </div>
      ) : null}
    </div>
  );
}
