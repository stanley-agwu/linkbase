import type { ProfileTheme } from "@/lib/types";

type ProfileLinkProps = {
  theme: Pick<ProfileTheme, "btnBg" | "btnFg" | "btnBorder" | "radius">;
  /** Omit for previews: the button renders as inert text, not a link. */
  href?: string;
  size?: "lg" | "sm";
  /** For click tracking; navigation still follows the `href`. */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  onAuxClick?: React.MouseEventHandler<HTMLAnchorElement>;
  children: React.ReactNode;
};

/** A themed link button on a profile page. Colours come from the theme. */
export function ProfileLink({
  theme,
  href,
  size = "lg",
  onClick,
  onAuxClick,
  children,
}: ProfileLinkProps) {
  const className = `block truncate text-center font-semibold transition-transform duration-180 ease-brand hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${size === "sm" ? "px-2.5 py-[11px] text-2xs" : "p-4.5 text-md"}`;
  const style = {
    background: theme.btnBg,
    color: theme.btnFg,
    border: `1.5px solid ${theme.btnBorder ?? theme.btnBg}`,
    borderRadius: theme.radius,
  };

  if (!href) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      onAuxClick={onAuxClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
