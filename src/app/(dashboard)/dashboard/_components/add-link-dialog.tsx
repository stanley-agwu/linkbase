"use client";

import { useActionState, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  type ActionResult,
  type CreateLinkInput,
  idle,
} from "@/lib/validation";
import type { DashboardLink } from "@/lib/types";

import { createLink } from "../_actions";

/**
 * The "Add link" button and its modal. A native `<dialog>` opened with
 * `showModal()` traps focus, closes on Escape, and inerts the page behind it.
 */
export function AddLinkDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // A fresh form, and so a fresh action state, each time the dialog opens.
  const [opened, setOpened] = useState(0);

  function open() {
    setOpened((count) => count + 1);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <Button size="lg" fullWidth onClick={open}>
        <span aria-hidden="true">+</span> Add
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(480px,calc(100vw-40px))] rounded-md border border-subtle bg-surface-card p-6 text-strong backdrop:bg-ink-900/40"
      >
        <h2
          id={titleId}
          className="m-0 mb-5 font-display text-2xl font-extrabold tracking-tight"
        >
          Add a link
        </h2>
        <AddLinkForm key={opened} onDone={close} />
      </dialog>
    </>
  );
}

function AddLinkForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (
      previous: ActionResult<CreateLinkInput, DashboardLink>,
      formData: FormData,
    ) => {
      const result = await createLink(previous, formData);
      if (result.status === "success") onDone();
      return result;
    },
    idle,
  );
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const formMessage = state.status === "error" ? state.formError : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <TextField
        label="Title"
        name="title"
        placeholder="My portfolio"
        autoComplete="off"
        defaultValue={values.title}
        error={errors.title?.[0]}
        autoFocus
      />
      <TextField
        label="URL"
        name="url"
        type="url"
        placeholder="https://"
        autoComplete="url"
        inputMode="url"
        defaultValue={values.url}
        error={errors.url?.[0]}
      />
      {formMessage ? (
        <p role="alert" className="m-0 text-sm text-status-error">
          {formMessage}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add link"}
        </Button>
      </div>
    </form>
  );
}
