import type { ProfileTheme } from "@/lib/types";
import { ProfilePhone } from "@/components/profile/profile-phone";
import { ClaimInput } from "@/components/ui/claim-input";

import { Eyebrow } from "./eyebrow";
import { StatCard } from "./stat-card";

// The hero phone uses the brand's own paper look rather than a template.
const PAPER_THEME: ProfileTheme = {
  bg: "var(--color-paper-phone)",
  fg: "var(--color-ink-900)",
  btnBg: "var(--color-ink-900)",
  btnFg: "var(--color-cream-150)",
  btnBorder: "var(--color-ink-900)",
  avatar: "var(--color-avatar-a)",
  avatar2: "var(--color-avatar-b)",
  radius: "14px",
  font: "var(--font-sans)",
};

const HERO_LINKS = [
  "Shop the spring drop",
  "Studio diary on YouTube",
  "Join the newsletter",
  "Book a workshop",
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-container grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-center gap-[clamp(40px,5vw,56px)] px-[clamp(20px,3vw,24px)] pt-[clamp(40px,7vw,72px)] pb-[clamp(64px,9vw,96px)]">
      <div className="flex flex-col gap-[clamp(20px,3vw,28px)]">
        <Eyebrow>Link in bio, done properly</Eyebrow>
        <h1 className="m-0 font-display text-[clamp(48px,7vw,96px)] leading-[0.94] font-extrabold tracking-[-0.045em] text-balance">
          One link. Everything you make.
        </h1>
        <p className="m-0 max-w-[520px] text-[clamp(17px,1.6vw,19px)] leading-body text-pretty text-body">
          Put your videos, shop, newsletter and socials on one page. Share it
          once in every bio, then update it whenever you like.
        </p>
        <ClaimInput />
      </div>

      {/* Illustration of a finished page — decorative. */}
      <div aria-hidden="true" className="relative flex justify-center py-6">
        <div className="absolute inset-x-[6%] inset-y-[8%] -rotate-4 rounded-blob bg-iris-500" />
        <div className="relative w-[min(78%,330px)] overflow-hidden rounded-phone border-8 border-ink-900 bg-paper-phone shadow-phone">
          <ProfilePhone
            theme={PAPER_THEME}
            name="@yourname"
            bio="Ceramics, studio diaries, small-batch drops"
            links={HERO_LINKS}
          />
        </div>
        <div className="absolute right-0 bottom-[14%]">
          <StatCard floating label="Clicks this week" value="2,418" />
        </div>
      </div>
    </section>
  );
}
