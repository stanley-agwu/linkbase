import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export type VerifiedSession = {
  userId: string;
  email: string;
  name: string | null;
};

/**
 * The session, or null. For code that renders differently when signed out.
 * `cache()` makes every caller in one render share a single verification.
 */
export const verifySession = cache(
  async (): Promise<VerifiedSession | null> => {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || !user.email) return null;
    return { userId: user.id, email: user.email, name: user.name ?? null };
  },
);

/** The user id, or a redirect to log in. For anything that must not run signed out. */
export async function requireUserId(): Promise<string> {
  const session = await verifySession();
  if (!session) redirect("/login");
  return session.userId;
}
