"use client";

import {
  useActionState,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import { Button } from "@/components/ui/button";
import { SOON_CLASS, SoonTag } from "@/components/ui/soon-tag";
import { TextField } from "@/components/ui/text-field";
import { Toggle } from "@/components/ui/toggle";
import type { DashboardLink } from "@/lib/types";
import {
  type ActionResult,
  idle,
  type UpdateLinkInput,
} from "@/lib/validation";

import { moveLink, setLinkVisibility, updateLink } from "../_actions";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

const ROW =
  "flex gap-3 rounded-md border border-subtle bg-surface-card px-3 py-3.5 sm:gap-3.5 sm:px-4";

const ARROW =
  "grid size-7 place-items-center rounded-xs bg-action-soft text-[11px] text-strong hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 disabled:cursor-not-allowed disabled:opacity-40";

const clicksFormat = new Intl.NumberFormat("en");

// Per-link features from the mockup that don't exist yet.
const SOON_ACTIONS = ["Thumbnail", "Schedule", "Lock"];

type LinkRowProps = {
  link: DashboardLink;
  first: boolean;
  last: boolean;
};

/**
 * One link on the dashboard (ui.md §1.21): reorder arrows, the text (click
 * to edit inline), clicks, the show/hide switch and delete.
 */
export function LinkRow({ link, first, last }: LinkRowProps) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string>();
  const [visible, setOptimisticVisible] = useOptimistic(link.visible);
  const [pending, startTransition] = useTransition();
  const editTrigger = useRef<HTMLButtonElement>(null);

  function stopEditing() {
    setEditing(false);
    // Back to where the user started, once the trigger is rendered again.
    requestAnimationFrame(() => editTrigger.current?.focus());
  }

  // Called without a form (data-mutations.md §6.2): check the result, or a
  // failed write would look like it worked.
  function report(result: ActionResult<unknown>) {
    setMessage(
      result.status === "error"
        ? (result.formError ?? "That didn’t save. Try again.")
        : undefined,
    );
  }

  function toggleVisible(next: boolean) {
    startTransition(async () => {
      setOptimisticVisible(next);
      report(await setLinkVisibility(link.id, next));
    });
  }

  function move(direction: "up" | "down") {
    startTransition(async () => {
      report(await moveLink(link.id, direction));
    });
  }

  if (editing) return <EditLinkForm link={link} onDone={stopEditing} />;

  return (
    <div className={ROW}>
      <div className="flex flex-col gap-1.5 pt-0.5">
        <button
          type="button"
          aria-label={`Move “${link.title}” up`}
          disabled={first || pending}
          onClick={() => move("up")}
          className={ARROW}
        >
          <span aria-hidden="true">▲</span>
        </button>
        <button
          type="button"
          aria-label={`Move “${link.title}” down`}
          disabled={last || pending}
          onClick={() => move("down")}
          className={ARROW}
        >
          <span aria-hidden="true">▼</span>
        </button>
      </div>

      <div
        className={`flex min-w-0 flex-1 flex-col gap-2 transition-opacity duration-180 ${visible ? "" : "opacity-55"}`}
      >
        <button
          ref={editTrigger}
          type="button"
          aria-label={`Edit “${link.title}”`}
          onClick={() => setEditing(true)}
          className="flex min-w-0 cursor-text flex-col items-start gap-0.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
        >
          <span className="max-w-full truncate text-md font-semibold text-strong">
            {link.title}
          </span>
          <span className="max-w-full truncate font-mono text-sm text-muted">
            {link.url}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
          {SOON_ACTIONS.map((label) => (
            <span key={label} aria-disabled="true" className={SOON_CLASS}>
              {label}
            </span>
          ))}
          <SoonTag />
          <span className="font-mono text-muted">
            {clicksFormat.format(link.clicks)}{" "}
            {link.clicks === 1 ? "click" : "clicks"}
          </span>
        </div>
        {message ? (
          <p role="alert" className="m-0 text-sm text-status-error">
            {message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <Toggle
          checked={visible}
          onCheckedChange={toggleVisible}
          label={`Show “${link.title}”`}
        />
        <ConfirmDeleteDialog linkId={link.id} title={link.title} />
      </div>
    </div>
  );
}

type EditLinkFormProps = {
  link: DashboardLink;
  onDone: () => void;
};

/**
 * Mounted only while editing, so every edit starts from the saved values and
 * a clean action state. Cancel or Escape drops the changes.
 */
function EditLinkForm({ link, onDone }: EditLinkFormProps) {
  const [state, formAction, pending] = useActionState(
    async (
      previous: ActionResult<UpdateLinkInput, DashboardLink>,
      formData: FormData,
    ) => {
      const result = await updateLink(previous, formData);
      if (result.status === "success") onDone();
      return result;
    },
    idle,
  );
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const formMessage =
    state.status === "error"
      ? (state.formError ?? errors.linkId?.[0])
      : undefined;

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") onDone();
  }

  return (
    <form
      action={formAction}
      noValidate
      onKeyDown={handleKeyDown}
      aria-label={`Edit “${link.title}”`}
      className={`${ROW} flex-wrap items-start`}
    >
      <input type="hidden" name="linkId" value={link.id} />
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
        <TextField
          name="title"
          aria-label="Link title"
          size="sm"
          autoComplete="off"
          defaultValue={values.title ?? link.title}
          error={errors.title?.[0]}
          autoFocus
        />
        <TextField
          name="url"
          type="url"
          aria-label="Link URL"
          size="sm"
          inputMode="url"
          placeholder="Add a URL"
          defaultValue={values.url ?? link.url}
          error={errors.url?.[0]}
        />
        {formMessage ? (
          <p role="alert" className="m-0 text-sm text-status-error">
            {formMessage}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
