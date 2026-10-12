/**
 * Marks a control whose feature isn't built yet. The control itself is
 * rendered disabled; this tag says why, to sighted and screen-reader users
 * alike.
 */
export function SoonTag() {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-soft px-1.5 py-px font-mono text-[10px] leading-4 tracking-wider text-muted uppercase">
      Soon
    </span>
  );
}

/** The muted, not-clickable look shared by every unbuilt control. */
export const SOON_CLASS = "cursor-not-allowed text-muted";
