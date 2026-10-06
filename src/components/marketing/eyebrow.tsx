type EyebrowProps = {
  size?: "md" | "sm";
  /** "inherit" on colour blocks, where muted text would clash. */
  tone?: "muted" | "inherit";
  children: React.ReactNode;
};

/** Uppercase mono kicker above headings, e.g. "01 — Analytics". */
export function Eyebrow({
  size = "md",
  tone = "muted",
  children,
}: EyebrowProps) {
  return (
    <span
      className={`font-mono uppercase ${size === "sm" ? "text-eyebrow-sm" : "text-eyebrow"} ${tone === "muted" ? "text-muted" : ""}`}
    >
      {children}
    </span>
  );
}
