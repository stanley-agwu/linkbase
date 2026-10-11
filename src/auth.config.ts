import type { NextAuthConfig } from "next-auth";

const DAY_SECONDS = 24 * 60 * 60;

/**
 * The provider-free half of the NextAuth config. It never touches the
 * database, which is what lets `proxy.ts` import it for a cookie-only session
 * check (database.md §1). `auth.ts` adds the credentials provider on top.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  // Credentials sign-in requires JWT sessions (auth.md §1). A JWT can't be
  // revoked before it expires, so the lifetime is kept short: 7 days, rolled
  // forward at most once a day while the user is active.
  session: { strategy: "jwt", maxAge: 7 * DAY_SECONDS, updateAge: DAY_SECONDS },
  providers: [],
  callbacks: {
    // `user` is only present on sign-in; afterwards the id rides in the token.
    // Name and email are copied into the token by NextAuth's defaults.
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      return session;
    },
  },
} satisfies NextAuthConfig;
