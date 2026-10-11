import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUsername } from "@/lib/db";

export type VerifiedSession = {
  userId: string;
  email: string;
  name: string | null;
  /** From the token, so possibly stale; `requireUsername` checks the database. */
  username: string | null;
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
    return {
      userId: user.id,
      email: user.email,
      name: user.name ?? null,
      username: user.username ?? null,
    };
  },
);

/** The user id, or a redirect to log in. For anything that must not run signed out. */
export async function requireUserId(): Promise<string> {
  const session = await verifySession();
  if (!session) redirect("/login");
  return session.userId;
}

/**
 * The user id and username, or a redirect: to log in when signed out, to
 * onboarding when no username is set. Reads the database rather than trusting
 * the token, which can lag behind. For every page past onboarding.
 */
export async function requireUsername(): Promise<{
  userId: string;
  username: string;
}> {
  const userId = await requireUserId();
  const username = await getUsername(userId);
  if (!username) redirect("/onboarding");
  return { userId, username };
}
