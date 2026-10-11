import type { DefaultSession } from "next-auth";

// The `session` callback in auth.config.ts always sets the user id, so every
// session the app sees carries one. `username` is null until onboarding.
declare module "next-auth" {
  interface Session {
    user: { id: string; username: string | null } & DefaultSession["user"];
  }

  interface User {
    username?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
  }
}
