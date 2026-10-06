type LogoProps = {
  /** Wordmark size in px: 24 marketing nav, 22 compact nav, 20 footer. */
  size?: number;
  /** For dark surfaces: cream wordmark, ink centre dot. */
  inverse?: boolean;
  markOnly?: boolean;
};

export function Logo({
  size = 24,
  inverse = false,
  markOnly = false,
}: LogoProps) {
  const mark = Math.round(size * 1.25);

  return (
    <span
      className={`inline-flex items-center font-display leading-none font-extrabold tracking-[-0.03em] ${inverse ? "text-on-inverse" : "text-strong"}`}
      style={{ fontSize: size, gap: size * 0.28 }}
    >
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="flex-none"
      >
        <rect
          x="11"
          y="11"
          width="42"
          height="42"
          rx="11"
          transform="rotate(45 32 32)"
          fill="var(--color-ember-500)"
        />
        <circle
          cx="32"
          cy="32"
          r="8"
          fill={inverse ? "var(--color-ink-900)" : "var(--color-cream-50)"}
        />
      </svg>
      {!markOnly && "linkbase"}
    </span>
  );
}
