"use client";

import { useEffect, useRef, useState } from "react";

const RESET_MS = 1500;

type CopyState = "idle" | "copied" | "failed";

const LABELS: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Copy failed",
};

/**
 * The page address in a pill with a Copy button (ui.md §1.22). Shows the URL
 * without its protocol and copies it whole, announcing the result.
 */
export function ShareBar({ url }: { url: string }) {
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
    <div className="flex max-w-full items-center gap-1 rounded-full border border-subtle bg-surface-card py-1 pr-1 pl-3.5 text-sm">
      <span className="min-w-0 truncate font-mono text-[13px] text-strong">
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 cursor-pointer rounded-full bg-surface-soft px-3 py-1.75 text-[13px] font-semibold text-strong hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
      >
        {LABELS[state]}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? `Copied ${url}` : ""}
        {state === "failed" ? "Couldn’t copy the link" : ""}
      </span>
    </div>
  );
}
