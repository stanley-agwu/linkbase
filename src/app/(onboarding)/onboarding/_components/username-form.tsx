"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  idle,
  sanitizeHandle,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";

import {
  chooseUsername,
  checkUsernameAvailability,
  type UsernameAvailability,
} from "../_actions";

const CHECK_DELAY_MS = 400;
const HELPER = `${HANDLE_MIN_LENGTH}–${HANDLE_MAX_LENGTH} characters: letters, numbers, hyphens and underscores.`;

type UsernameFormProps = {
  /** A handle claimed on the landing page, already validated. */
  defaultValue?: string;
  /** A template picked before signup, passed on to the look step. */
  template?: string;
};

/**
 * The onboarding username field: `linkbase.me/` prefix, sanitised as you type,
 * with a debounced availability hint and, when the name is taken, a few free
 * alternatives to pick from. The server re-validates on submit, and the
 * unique index has the final say.
 */
export function UsernameForm({
  defaultValue = "",
  template,
}: UsernameFormProps) {
  const messageId = useId();
  const [state, formAction, submitting] = useActionState(chooseUsername, idle);
  const [value, setValue] = useState(defaultValue);
  const [availability, setAvailability] = useState<UsernameAvailability | null>(
    null,
  );
  const [checking, startCheck] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(defaultValue);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = sanitizeHandle(event.target.value);
    setValue(next);
    latest.current = next;
    setAvailability(null);
    clearTimeout(timer.current);
    if (next.length < HANDLE_MIN_LENGTH) return;

    timer.current = setTimeout(() => {
      startCheck(async () => {
        const result = await checkUsernameAvailability(next);
        // A slower answer for an older value must not overwrite a newer one.
        if (latest.current === next) setAvailability(result);
      });
    }, CHECK_DELAY_MS);
  }

  /** Fills the field with a suggestion the check just reported as free. */
  function pickSuggestion(suggestion: string) {
    clearTimeout(timer.current);
    setValue(suggestion);
    latest.current = suggestion;
    setAvailability({ status: "available" });
  }

  // The server's error describes what was submitted; once the field changes
  // it no longer applies.
  const submitted =
    state.status === "error" ? state.values.username : undefined;
  const serverError =
    state.status === "error" && submitted === value
      ? state.fieldErrors.username?.[0]
      : undefined;

  const { message, tone } = describe(
    value,
    serverError,
    checking,
    availability,
  );
  const suggestions =
    !checking && availability?.status === "taken"
      ? availability.suggestions
      : [];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {template ? (
        <input type="hidden" name="template" value={template} />
      ) : null}
      <div className="flex flex-col gap-3">
        <label
          className={`flex h-15 cursor-text items-center rounded-input bg-surface-card px-4.5 text-input text-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ember-500 ${tone === "error" ? "border-[1.5px] border-status-error-border" : "border-[1.5px] border-strong-border"}`}
        >
          <span className="text-muted">linkbase.me/</span>
          <input
            name="username"
            value={value}
            onChange={handleChange}
            placeholder="yourname"
            aria-label="Username"
            aria-invalid={tone === "error"}
            aria-describedby={messageId}
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            required
            className="min-w-0 flex-1 bg-transparent font-semibold text-inherit outline-none focus-visible:outline-none"
          />
        </label>
        <p
          id={messageId}
          aria-live="polite"
          className={`m-0 min-h-5 text-sm ${TONES[tone]}`}
        >
          {message}
        </p>
        {suggestions.length > 0 ? (
          <ul
            aria-label="Suggested usernames"
            className="m-0 flex list-none flex-wrap gap-2 p-0"
          >
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => pickSuggestion(suggestion)}
                >
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}

type Tone = "muted" | "success" | "error";

const TONES: Record<Tone, string> = {
  muted: "text-muted",
  success: "text-status-success",
  error: "text-status-error",
};

function describe(
  value: string,
  serverError: string | undefined,
  checking: boolean,
  availability: UsernameAvailability | null,
): { message: string; tone: Tone } {
  if (serverError) return { message: serverError, tone: "error" };
  if (checking) return { message: "Checking…", tone: "muted" };
  if (!availability) return { message: HELPER, tone: "muted" };

  switch (availability.status) {
    case "available":
      return {
        message: `linkbase.me/${value} is available — nice pick.`,
        tone: "success",
      };
    case "taken":
      return {
        message:
          availability.suggestions.length > 0
            ? `linkbase.me/${value} is taken. Try one of these:`
            : `linkbase.me/${value} is taken.`,
        tone: "error",
      };
    case "invalid":
    case "rate-limited":
      return { message: availability.message, tone: "error" };
  }
}
