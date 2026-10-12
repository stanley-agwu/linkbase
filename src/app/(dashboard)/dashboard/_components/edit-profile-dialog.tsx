"use client";

import { useActionState, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  type ActionResult,
  BIO_MAX_LENGTH,
  idle,
  type UpdateProfileInput,
} from "@/lib/validation";

import { updateProfile } from "../_actions";

type EditProfileDialogProps = {
  username: string;
  displayName: string | null;
  bio: string | null;
};

/** The profile header's "…" button and the name-and-bio form it opens. */
export function EditProfileDialog({
  username,
  displayName,
  bio,
}: EditProfileDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // A fresh form, and so fresh values and errors, each time it opens.
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
      <button
        type="button"
        aria-label="Edit profile"
        onClick={open}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-subtle bg-surface-card text-strong hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
      >
        <span aria-hidden="true">…</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(480px,calc(100vw-40px))] rounded-md border border-subtle bg-surface-card p-6 text-strong backdrop:bg-ink-900/40"
      >
        <h2
          id={titleId}
          className="m-0 mb-5 font-display text-2xl font-extrabold tracking-tight"
        >
          Edit profile
        </h2>
        <EditProfileForm
          key={opened}
          username={username}
          displayName={displayName}
          bio={bio}
          onDone={close}
        />
      </dialog>
    </>
  );
}

function EditProfileForm({
  username,
  displayName,
  bio,
  onDone,
}: EditProfileDialogProps & { onDone: () => void }) {
  const bioId = useId();
  const bioErrorId = `${bioId}-error`;
  const [state, formAction, pending] = useActionState(
    async (previous: ActionResult<UpdateProfileInput>, formData: FormData) => {
      const result = await updateProfile(previous, formData);
      if (result.status === "success") onDone();
      return result;
    },
    idle,
  );
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const formMessage = state.status === "error" ? state.formError : undefined;
  const bioError = errors.bio?.[0];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <TextField
        label="Display name"
        name="displayName"
        placeholder={`@${username}`}
        autoComplete="name"
        defaultValue={values.displayName ?? displayName ?? ""}
        error={errors.displayName?.[0]}
        autoFocus
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={bioId} className="text-sm font-medium text-strong">
          Bio
        </label>
        <textarea
          id={bioId}
          name="bio"
          rows={3}
          placeholder="A line about what you make"
          defaultValue={values.bio ?? bio ?? ""}
          aria-invalid={bioError ? true : undefined}
          aria-describedby={bioError ? bioErrorId : undefined}
          className={`w-full resize-y rounded-md bg-surface-card px-4 py-3 text-md text-strong placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 ${bioError ? "border-[1.5px] border-status-error-border" : "border border-default"}`}
        />
        {bioError ? (
          <p id={bioErrorId} className="m-0 text-sm text-status-error">
            {bioError}
          </p>
        ) : (
          <p className="m-0 text-sm text-muted">
            Up to {BIO_MAX_LENGTH} characters.
          </p>
        )}
      </div>
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
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
