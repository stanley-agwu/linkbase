import Link from "next/link";

type ButtonVariant = "primary" | "dark" | "soft" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Trailing glyph such as "→"; hidden from assistive tech. */
  iconRight?: string;
};

// Each variant restates its text colour on hover so ButtonLink doesn't pick up
// the global link-hover colour from globals.css.
const VARIANTS: Record<ButtonVariant, string> = {
  // Ember buttons take an ink focus ring; the default ember ring would vanish.
  primary:
    "bg-action-primary text-on-accent hover:bg-action-primary-hover hover:text-on-accent focus-visible:outline-ink-900",
  dark: "bg-action-dark text-on-inverse hover:text-on-inverse hover:opacity-85",
  soft: "bg-action-soft text-strong hover:text-strong hover:opacity-85",
  outline:
    "border border-default bg-transparent text-strong hover:text-strong hover:opacity-85",
  ghost: "bg-transparent text-strong hover:text-strong hover:opacity-85",
};

const SIZES: Record<ButtonSize, string> = {
  lg: "h-15 px-7 text-input",
  md: "h-12 px-5.5 text-nav",
  sm: "h-9 px-3.5 text-xs",
};

function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: ButtonStyleProps): string {
  return [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold",
    "transition-[background-color,opacity] duration-180 ease-brand",
    "cursor-pointer disabled:cursor-default disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : "",
  ].join(" ");
}

function ButtonContent({
  iconRight,
  children,
}: {
  iconRight?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {iconRight && <span aria-hidden="true">{iconRight}</span>}
    </>
  );
}

type ButtonProps = ButtonStyleProps & React.ComponentProps<"button">;

/** A pill action. Use `ButtonLink` when the click navigates. */
export function Button({
  variant,
  size,
  fullWidth,
  iconRight,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonClassName({ variant, size, fullWidth })} ${className ?? ""}`}
      {...rest}
    >
      <ButtonContent iconRight={iconRight}>{children}</ButtonContent>
    </button>
  );
}

type ButtonLinkProps = ButtonStyleProps &
  Omit<React.ComponentProps<typeof Link>, "className"> & {
    className?: string;
  };

/** Looks like a Button, navigates like a link. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  iconRight,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={`${buttonClassName({ variant, size, fullWidth })} ${className ?? ""}`}
      {...rest}
    >
      <ButtonContent iconRight={iconRight}>{children}</ButtonContent>
    </Link>
  );
}
