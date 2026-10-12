"use client";

import { useActionState, useState } from "react";

import { ProfilePhone } from "@/components/profile/profile-phone";
import { PROFILE_TEMPLATES } from "@/components/profile/templates";
import { ThemeSwatch } from "@/components/profile/theme-swatch";
import { ButtonLink, Button } from "@/components/ui/button";
import { idle } from "@/lib/validation";
import type { ThemeId } from "@/lib/types";

import { chooseLook } from "../_actions";

type LookFormProps = {
  username: string;
  initialThemeId: ThemeId;
};

/**
 * The "Pick a look" step: a ThemeSwatch radiogroup, and from `lg` up a phone
 * preview beside it that follows the selection before anything is saved.
 */
export function LookForm({ username, initialThemeId }: LookFormProps) {
  const [themeId, setThemeId] = useState(initialThemeId);
  const [state, formAction, pending] = useActionState(chooseLook, idle);
  const theme =
    PROFILE_TEMPLATES.find((template) => template.id === themeId) ??
    PROFILE_TEMPLATES[0];
  const formMessage =
    state.status === "error"
      ? (state.fieldErrors.themeId?.[0] ?? state.formError)
      : undefined;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <form action={formAction} className="flex flex-col gap-8">
        <input type="hidden" name="themeId" value={themeId} />
        <div className="flex flex-col gap-2">
          <h1
            id="look-heading"
            className="m-0 font-display text-h3 font-extrabold"
          >
            Pick a look.
          </h1>
          <p className="m-0 text-md text-body">
            Start with a template. Everything stays editable.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="look-heading"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-3"
        >
          {PROFILE_TEMPLATES.map((template) => (
            <ThemeSwatch
              key={template.id}
              theme={template}
              selected={template.id === themeId}
              onSelect={() => setThemeId(template.id)}
            />
          ))}
        </div>
        {formMessage ? (
          <p role="alert" className="m-0 text-sm text-status-error">
            {formMessage}
          </p>
        ) : null}
        <div className="flex flex-wrap-reverse gap-2">
          <ButtonLink href="/dashboard" variant="soft">
            Skip for now
          </ButtonLink>
          <Button
            type="submit"
            iconRight="→"
            disabled={pending}
            className="flex-[1_1_200px]"
          >
            {pending ? "Saving…" : "Open my dashboard"}
          </Button>
        </div>
      </form>

      <aside
        aria-label="Your page, so far"
        className="hidden flex-col items-center gap-5 self-start rounded-md bg-surface-soft p-10 lg:flex"
      >
        <span className="font-mono text-xs tracking-widest text-muted uppercase">
          Your page, so far
        </span>
        <div className="w-full max-w-[300px]">
          <ProfilePhone
            framed
            social={false}
            theme={theme}
            name={`@${username}`}
            bio={theme.bio}
            links={theme.links}
          />
        </div>
      </aside>
    </div>
  );
}
