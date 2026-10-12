import type { Metadata } from "next";

import { requireUsername } from "@/lib/auth";
import { getProfileSettings } from "@/lib/db";
import { getPublicProfileUrl } from "@/lib/public-url";

import { DashboardHeader } from "../_components/dashboard-header";

import { AppearanceForm } from "./_components/appearance-form";

export const metadata: Metadata = { title: "Appearance" };

/** Theme, button shape and font for the public page (the "Dashboard — appearance" mockup). */
export default async function AppearancePage() {
  const { userId, username } = await requireUsername();
  const [{ themeId, buttonShape, font }, publicUrl] = await Promise.all([
    getProfileSettings(userId),
    getPublicProfileUrl(username),
  ]);

  return (
    <>
      <DashboardHeader title="Appearance" publicUrl={publicUrl} />
      <main className="mx-auto flex w-full max-w-[760px] flex-col px-[clamp(20px,4vw,48px)] pt-8 pb-28 lg:pb-12">
        <AppearanceForm appearance={{ themeId, buttonShape, font }} />
      </main>
    </>
  );
}
