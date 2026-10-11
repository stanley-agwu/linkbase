"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signUp } from "@/lib/auth/actions";
import { idle, PASSWORD_MIN_LENGTH } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type SignUpFormProps = {
  /** Where to go once the account exists. Checked again on the server. */
  next: string;
};

export function SignUpForm({ next }: SignUpFormProps) {
  const [state, formAction, pending] = useActionState(signUp, idle);
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
        autoComplete="new-password"
        required
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        error={errors.password?.[0]}
      />
      {formMessage ? (
        <p role="alert" className="m-0 text-sm text-status-error">
          {formMessage}
        </p>
      ) : null}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="m-0 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-strong underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
