"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const RESET_MS = 1500;

type CopyState = "idle" | "copied" | "failed";

const LABELS: Record<CopyState, string> = {
  idle: "Share",
  copied: "Copied",
  failed: "Copy failed",
};

/** Copies the public page's URL (ui.md §1.22), announcing the result. */
export function ShareButton({ url }: { url: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      // Clipboard access can be denied (permissions, insecure context).
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), RESET_MS);
  }

  return (
    <>
      <Button variant="dark" size="sm" onClick={() => void copy()}>
        {LABELS[state]}
      </Button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? `Copied ${url}` : ""}
        {state === "failed" ? "Couldn’t copy the link" : ""}
      </span>
    </>
  );
}
