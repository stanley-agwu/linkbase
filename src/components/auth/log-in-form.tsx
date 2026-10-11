"use client";

import { useActionState } from "react";
import Link from "next/link";

import { logIn } from "@/lib/auth/actions";
import { idle } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type LogInFormProps = {
  /** Where to return after logging in. Checked again on the server. */
  next: string;
};

export function LogInForm({ next }: LogInFormProps) {
  const [state, formAction, pending] = useActionState(logIn, idle);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const formMessage = state.status === "error" ? state.formError : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={values.email}
        error={errors.email?.[0]}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password?.[0]}
      />
      {formMessage ? (
        <p role="alert" className="m-0 text-sm text-status-error">
          {formMessage}
        </p>
      ) : null}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <p className="m-0 text-center text-sm text-muted">
        New to Linkbase?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="font-semibold text-strong underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
