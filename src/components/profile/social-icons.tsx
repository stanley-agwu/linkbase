type SocialIconsProps = {
  /** Simple Icons slugs. */
  networks?: string[];
  color?: string;
  size?: number;
  gap?: number;
};

/**
 * Monochrome social glyphs from the Simple Icons CDN, tinted with a CSS mask
 * (a flagged substitution — design-system.md §11). This version is the
 * decorative preview row; real profile links come with the profile page.
 * When CSP lands, `cdn.simpleicons.org` must be in `img-src` (security.md).
 */
export function SocialIcons({
  networks = ["tiktok", "youtube", "x", "instagram"],
  color = "currentColor",
  size = 26,
  gap = 14,
}: SocialIconsProps) {
  return (
    <div aria-hidden="true" className="flex items-center" style={{ gap }}>
      {networks.map((network) => {
        const mask = `url(https://cdn.simpleicons.org/${network}) center / contain no-repeat`;
        return (
          <span
            key={network}
            className="block"
            style={{
              width: size,
              height: size,
              background: color,
              WebkitMask: mask,
              mask,
            }}
          />
        );
      })}
    </div>
  );
}
