type PortraitTone = "ember" | "iris" | "ink" | "cream";

type PortraitProps = {
  name: string;
  tone?: PortraitTone;
  /** Custom colours; override `tone`. Used for profile themes. */
  bg?: string;
  fg?: string;
  shape?: "circle" | "rect";
  /** Fixed size in px. Without it the portrait fills its container's width. */
  size?: number;
  /** Aspect ratio for `rect`, e.g. "4/3". */
  ratio?: string;
};

const TONES: Record<PortraitTone, [bg: string, fg: string]> = {
  ember: ["var(--color-ember-500)", "var(--color-ink-900)"],
  iris: ["var(--color-iris-500)", "var(--color-ink-900)"],
  ink: ["var(--color-ink-900)", "var(--color-cream-150)"],
  cream: ["var(--color-cream-200)", "var(--color-ink-900)"],
};

function initialsOf(name: string): string {
  return name
    .replace(/^@/, "")
    .split(/[\s.&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Stand-in for photography: a flat colour block with big initials and a faint
 * echo of the logo mark. Decorative — callers show the name alongside it.
 */
export function Portrait({
  name,
  tone = "ember",
  bg,
  fg,
  shape = "circle",
  size,
  ratio = "1/1",
}: PortraitProps) {
  const [background, color] = bg
    ? [bg, fg ?? "var(--color-ink-900)"]
    : TONES[tone];
  const circle = shape === "circle";

  return (
    <div
      aria-hidden="true"
      className={`@container relative flex-none overflow-hidden ${circle ? "rounded-full" : "rounded-md"}`}
      style={{
        background,
        color,
        width: size ?? "100%",
        height: size,
        aspectRatio: size ? undefined : circle ? "1/1" : ratio,
      }}
    >
      <span
        className="absolute -right-[22%] -bottom-[22%] aspect-square w-[70%] rotate-45 rounded-[22%] opacity-12"
        style={{ background: color }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center font-display leading-none font-extrabold tracking-[-0.04em] ${circle ? "text-[40cqw]" : "text-[26cqw]"}`}
      >
        {initialsOf(name)}
      </span>
    </div>
  );
}
