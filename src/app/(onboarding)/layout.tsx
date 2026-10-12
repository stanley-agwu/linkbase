import { Logo } from "@/components/ui/logo";

/**
 * The onboarding shell (ui.md §2.3): a logo bar, no account menu. Each step
 * sets its own column (the look step adds a preview beside it). Not an auth
 * gate — the pages check the session themselves (auth.md §3).
 */
export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <header className="mx-auto w-full max-w-[1240px]">
        <Logo size={22} />
      </header>
      {children}
    </div>
  );
}
