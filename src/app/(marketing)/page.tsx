import type { Metadata } from "next";

import { CtaPanel } from "@/components/marketing/cta-panel";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { FeatureCard } from "@/components/marketing/feature-card";
import { Hero } from "@/components/marketing/hero";
import { QuoteCard } from "@/components/marketing/quote-card";
import { TemplateCard } from "@/components/marketing/template-card";
import { TEMPLATE_FONT_VARIABLES } from "@/components/profile/template-fonts";
import { PROFILE_TEMPLATES } from "@/components/profile/templates";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { ClaimInput } from "@/components/ui/claim-input";
import { Footer } from "@/components/ui/footer";
import { NavBar } from "@/components/ui/nav-bar";

export const metadata: Metadata = {
  title: { absolute: "Linkbase — One link. Everything you make." },
};

const FEATURES = [
  {
    tone: "iris",
    eyebrow: "01 — Analytics",
    title: "See what people actually click.",
    body: "Views, clicks and top sources for every link, updated live.",
  },
  {
    tone: "ember",
    eyebrow: "02 — Commerce",
    title: "Sell without a separate store.",
    body: "Products, downloads and tips, checked out right on your page.",
  },
  {
    tone: "ink",
    eyebrow: "03 — Scheduling",
    title: "Links that show up on time.",
    body: "Queue a drop for Friday at 9am and it goes live on its own.",
  },
] as const;

const STORIES = [
  {
    quote:
      "I replaced four different links with one page. Clients find my booking form without asking.",
    name: "Priya Nair",
    role: "Brand photographer",
    handle: "priyanair",
    tone: "ember",
  },
  {
    quote:
      "We sell out drops faster because the shop link is always first, and I can schedule it the night before.",
    name: "Tomás Ferreira",
    role: "Founder, Oat & Ember",
    handle: "oatandember",
    tone: "iris",
  },
  {
    quote:
      "The analytics tell me which platform actually sends listeners. That changed where I post.",
    name: "Leah Brooks",
    role: "Host, Field Notes podcast",
    handle: "fieldnotes",
    tone: "ink",
  },
] as const;

const LANDING_TEMPLATES = PROFILE_TEMPLATES.slice(0, 4);

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Banner linkLabel="See how" linkHref="/#features">
        Scheduling is here. Queue a link for Friday at 9am and it goes live on
        its own.
      </Banner>
      <NavBar />

      <main className="flex-1">
        <Hero />

        <section
          id="features"
          aria-label="Features"
          className="mx-auto grid max-w-container scroll-mt-28 grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5 px-[clamp(20px,3vw,24px)] pb-[clamp(64px,9vw,96px)]"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.eyebrow} {...feature} />
          ))}
        </section>

        <section
          className={`border-y border-subtle bg-surface-card ${TEMPLATE_FONT_VARIABLES}`}
        >
          <div className="mx-auto flex max-w-container flex-col gap-[clamp(32px,5vw,56px)] px-[clamp(20px,3vw,24px)] py-[clamp(64px,9vw,96px)]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex max-w-[720px] flex-col gap-4">
                <Eyebrow>Templates</Eyebrow>
                <h2 className="m-0 font-display text-h2 font-extrabold text-balance">
                  Start from a template. Make it yours in minutes.
                </h2>
              </div>
              <ButtonLink href="/templates" variant="outline" iconRight="→">
                Browse all templates
              </ButtonLink>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-7">
              {LANDING_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  useHref={`/signup?template=${template.id}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-container flex-col gap-[clamp(32px,5vw,48px)] px-[clamp(20px,3vw,24px)] py-[clamp(64px,9vw,96px)]">
          <h2 className="m-0 max-w-[640px] font-display text-[clamp(36px,4.4vw,56px)] leading-none font-extrabold tracking-[-0.04em] text-balance">
            Used by people who take their work seriously.
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
            {STORIES.map((story) => (
              <QuoteCard key={story.handle} {...story} />
            ))}
          </div>
        </section>

        <CtaPanel title="Your corner of the internet is waiting.">
          <ClaimInput
            inverse
            helper="Free forever for one page. No card required."
          />
        </CtaPanel>
      </main>

      <Footer />
    </div>
  );
}
