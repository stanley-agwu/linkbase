"use client";

import { useActionState, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { idle } from "@/lib/validation";

import { deleteLink } from "../_actions";

type ConfirmDeleteDialogProps = {
  linkId: string;
  title: string;
};

/**
 * The row's × button and the confirmation it opens. The action deletes
 * whatever it's asked to; confirming is this component's job
 * (data-mutations.md §7). On success the row unmounts with the refresh.
 */
export function ConfirmDeleteDialog({
  linkId,
  title,
}: ConfirmDeleteDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const bodyId = useId();
  const [state, formAction, pending] = useActionState(deleteLink, idle);
  const message =
    state.status === "error"
      ? (state.formError ?? state.fieldErrors.linkId?.[0])
      : undefined;

  return (
    <>
      <button
        type="button"
        aria-label={`Delete “${title}”`}
        onClick={() => dialog.current?.showModal()}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg text-muted hover:bg-surface-soft hover:text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
      >
        <span aria-hidden="true">×</span>
      </button>
      <dialog
        ref={dialog}
        role="alertdialog"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        className="m-auto w-[min(420px,calc(100vw-40px))] rounded-md border border-subtle bg-surface-card p-6 text-strong backdrop:bg-ink-900/40"
      >
        <h2
          id={headingId}
          className="m-0 font-display text-2xl font-extrabold tracking-tight"
        >
          Delete this link?
        </h2>
        <p id={bodyId} className="m-0 mt-2 text-md break-words text-body">
          “{title}” will be removed from your page. This can’t be undone.
        </p>
        {message ? (
          <p role="alert" className="m-0 mt-3 text-sm text-status-error">
            {message}
          </p>
        ) : null}
        <form action={formAction} className="mt-6 flex justify-end gap-2">
          <input type="hidden" name="linkId" value={linkId} />
          {/* Focused first, so Enter on open is the safe choice. */}
          <Button
            variant="ghost"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" variant="dark" disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </dialog>
    </>
  );
}
