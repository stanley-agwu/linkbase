"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type OnboardingErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/** Fixed copy and the digest only — never error.message (errors-and-validation.md §5.2). */
export default function OnboardingError({
  error,
  retry,
}: OnboardingErrorProps) {
  useEffect(() => {
    console.error(error); // browser console only; the server already logged it
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-[540px] flex-col items-start gap-3 px-6 py-12"
    >
      <h2 className="m-0 font-display text-title font-extrabold">
        Something went wrong
      </h2>
      <p className="m-0 text-md text-body">
        We couldn’t load this page. Try again in a moment.
      </p>
      {error.digest ? (
        <p className="m-0 text-sm text-muted">Reference: {error.digest}</p>
      ) : null}
      <Button type="button" variant="outline" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
