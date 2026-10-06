import Link from "next/link";

import { ButtonLink } from "./button";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";

const NAV_LINKS = [
  { label: "Templates", href: "/templates" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "#" },
  { label: "Learn", href: "#" },
];

/**
 * Marketing nav. The floating pill shows at 1100px and up; below that the
 * compact bar with a menu drawer takes over (the design's breakpoints).
 */
export function NavBar() {
  return (
    <>
      <header className="sticky top-4 z-10 mt-4 hidden px-6 min-[1100px]:block">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-container items-center gap-8 rounded-full border border-subtle bg-surface-card py-2.5 pr-2.5 pl-7 shadow-nav"
        >
          <Link href="/" aria-label="Linkbase home">
            <Logo size={24} />
          </Link>
          <div className="flex flex-1 flex-wrap gap-6 text-nav font-medium">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            <ButtonLink href="/login" variant="soft">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup" variant="dark">
              Sign up free
            </ButtonLink>
          </div>
        </nav>
      </header>
      <NavMenu logo={<Logo size={22} />} links={NAV_LINKS} />
    </>
  );
}
