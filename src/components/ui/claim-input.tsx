"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { handleSchema, sanitizeHandle } from "@/lib/validation";

import { Button } from "./button";

type ClaimInputProps = {
  /** Shown under the field until the visitor submits. */
  helper?: string;
  /** For the ink CTA panel: no field border, light helper text. */
  inverse?: boolean;
};

type ClaimStatus = "idle" | "error";

/**
 * The "claim your link" control: `linkbase.me/` + handle + submit. Checks the
 * handle's format here; whether it's taken is checked at signup.
 */
export function ClaimInput({ helper = "", inverse = false }: ClaimInputProps) {
  const router = useRouter();
  const messageId = useId();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [message, setMessage] = useState(helper);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setValue(sanitizeHandle(event.target.value));
    if (status === "error") {
      setStatus("idle");
      setMessage(helper);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value) {
      setStatus("error");
      setMessage("Type the name you want after linkbase.me/");
      return;
    }
    const parsed = handleSchema.safeParse(value);
    if (!parsed.success) {
      setStatus("error");
      setMessage(parsed.error.issues[0]?.message ?? "Try a different name.");
      return;
    }
    router.push(`/signup?handle=${encodeURIComponent(parsed.data)}`);
  }

  const messageColor =
    status === "error"
      ? "text-status-error"
      : inverse
        ? "text-cream-400"
        : "text-muted";

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-3">
      <form onSubmit={handleSubmit} noValidate className="flex flex-wrap gap-2">
        <label
          className={`flex h-15 flex-[1_1_260px] cursor-text items-center rounded-input bg-surface-card px-4.5 text-input text-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ember-500 ${inverse ? "" : "border-[1.5px] border-strong-border"}`}
        >
          <span className="text-muted">linkbase.me/</span>
          <input
            value={value}
            onChange={handleChange}
            placeholder="yourname"
            aria-label="Your link name"
            aria-invalid={status === "error"}
            aria-describedby={messageId}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-semibold text-inherit outline-none focus-visible:outline-none"
          />
        </label>
        <Button type="submit" size="lg">
          Claim your link
        </Button>
      </form>
      <p
        id={messageId}
        aria-live="polite"
        className={`m-0 min-h-5 text-sm ${messageColor}`}
      >
        {message}
      </p>
    </div>
  );
}
