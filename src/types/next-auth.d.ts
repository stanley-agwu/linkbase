import type { DefaultSession } from "next-auth";

// The `session` callback in auth.config.ts always sets the user id, so every
// session the app sees carries one.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
