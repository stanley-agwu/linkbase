import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Product",
    links: ["Templates", "Analytics", "Commerce", "Pricing", "What’s new"],
  },
  { title: "Company", links: ["About", "Careers", "Blog", "Press"] },
  {
    title: "Support",
    links: ["Help center", "Getting started", "Report a page", "Status"],
  },
  { title: "Legal", links: ["Terms", "Privacy", "Cookies", "Trust"] },
];

// None of the footer destinations exist yet, so every link is a placeholder.
export function Footer() {
  return (
    <footer className="px-6 pb-8">
      <div className="mx-auto flex max-w-container flex-col gap-12 border-t border-default pt-14">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-8">
          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="mb-1 font-display text-title font-bold">
                {column.title}
              </h2>
              {column.links.map((link) => (
                <a key={link} href="#" className="text-nav text-secondary">
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <Logo size={20} />
          <span>© 2026 Linkbase. Made for people who make things.</span>
        </div>
      </div>
    </footer>
  );
}
