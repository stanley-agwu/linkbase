import { Logo } from "@/components/ui/logo";

/**
 * The onboarding shell (ui.md §2.3): logo bar and a narrow column, no account
 * menu. Not an auth gate — the page checks the session itself (auth.md §3).
 */
export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <header className="mx-auto w-full max-w-[1240px]">
        <Logo size={22} />
      </header>
      <main className="mx-auto mt-16 flex w-full max-w-[540px] flex-col gap-8">
        {children}
      </main>
    </div>
  );
}
