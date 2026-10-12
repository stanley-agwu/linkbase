"use client";

import { useRef } from "react";

import { ButtonLink } from "@/components/ui/button";

type PreviewDialogProps = {
  /** The public page, opened in a new tab from the dialog. */
  publicHref: string;
  children: React.ReactNode;
};

/**
 * Below `lg` the preview pane is hidden; this floating button shows the same
 * server-rendered preview in a modal instead.
 */
export function PreviewDialog({ publicHref, children }: PreviewDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  function handleClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="fixed right-5 bottom-5 z-20 flex h-12 items-center gap-2 rounded-full bg-action-dark px-5 text-nav font-semibold text-on-inverse shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 lg:hidden"
      >
        Preview
      </button>
      <dialog
        ref={dialog}
        aria-label="Live preview"
        onClick={handleClick}
        className="m-auto max-h-[calc(100dvh-32px)] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-md border border-subtle bg-page p-6 backdrop:bg-ink-900/50 lg:hidden"
      >
        <div className="flex flex-col items-center gap-4">
          {children}
          <ButtonLink href={publicHref} target="_blank" fullWidth iconRight="→">
            Open public page
          </ButtonLink>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="min-h-11 rounded-full px-5 text-nav font-semibold text-strong hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
