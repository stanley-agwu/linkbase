import { Suspense } from "react";
import type { Metadata } from "next";

import { HeaderAccount } from "@/components/auth/header-account";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { TemplateCard } from "@/components/marketing/template-card";
import { TEMPLATE_FONT_VARIABLES } from "@/components/profile/template-fonts";
import {
  templateCategoryFrom,
  templateFilters,
  templatesIn,
} from "@/components/profile/template-filter";
import { Chip } from "@/components/ui/chip";
import { Footer } from "@/components/ui/footer";
import { NavBar } from "@/components/ui/nav-bar";

export const metadata: Metadata = { title: "Templates" };

/**
 * The template gallery (ui.md §2.2, the "Template gallery" mockup): every
 * template, filtered by `?category=`. The filters are links, so the page
 * needs no client JavaScript. "Use" starts signup with the template
 * preselected for the onboarding look step.
 */
export default async function TemplatesPage({
  searchParams,
}: PageProps<"/templates">) {
  const selected = templateCategoryFrom((await searchParams).category);
  const templates = templatesIn(selected);
  const filters = templateFilters(selected);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        actions={
          <Suspense
            fallback={<span aria-hidden="true" className="h-11 w-11" />}
          >
            <HeaderAccount />
          </Suspense>
        }
        drawerActions={
          <Suspense fallback={null}>
            <HeaderAccount placement="drawer" />
          </Suspense>
        }
      />

      <main className="mx-auto w-full max-w-container flex-1 px-[clamp(20px,3vw,24px)] pt-[clamp(48px,7vw,72px)] pb-[clamp(64px,9vw,96px)]">
        <div className="mb-[clamp(32px,5vw,56px)] flex flex-col items-center gap-4 text-center">
          <h1 className="m-0 max-w-[820px] font-display text-[clamp(44px,6vw,80px)] leading-none font-extrabold tracking-[-0.04em] text-balance">
            A template for every kind of work.
          </h1>
          <p className="m-0 max-w-[600px] text-lg text-pretty text-secondary">
            Every template is fully editable — swap colours, fonts, button
            shapes and backgrounds.
          </p>
        </div>

        <div className="flex flex-col gap-[clamp(24px,4vw,40px)] lg:flex-row lg:items-start">
          <nav
            aria-label="Template categories"
            className="-mx-5 lg:sticky lg:top-30 lg:mx-0 lg:w-55 lg:shrink-0"
          >
            <span className="mb-1.5 hidden lg:block">
              <Eyebrow size="sm">Browse by category</Eyebrow>
            </span>
            {/* Below lg: one scrolling row. From lg: a stacked list. */}
            <ul className="m-0 flex list-none gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:px-0">
              {filters.map((filter) => (
                <li key={filter.label} className="shrink-0">
                  <Chip
                    href={filter.href}
                    selected={filter.selected}
                    className="lg:hidden"
                  >
                    {filter.label}
                  </Chip>
                  <Chip
                    href={filter.href}
                    selected={filter.selected}
                    block
                    className="max-lg:hidden"
                  >
                    {filter.label}
                  </Chip>
                </li>
              ))}
            </ul>
          </nav>

          <section
            aria-label={selected ? `${selected} templates` : "All templates"}
            className={`grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-[clamp(20px,3vw,28px)] sm:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] ${TEMPLATE_FONT_VARIABLES}`}
          >
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                useHref={`/signup?template=${template.id}`}
              />
            ))}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
