import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { consumeRateLimit, findUserForSignIn, getUsername } from "@/lib/db";
import { logError } from "@/lib/logger";
import { credentialsSchema } from "@/lib/validation";

import { authConfig } from "./auth.config";

const MINUTE_MS = 60 * 1000;

export const RATE_LIMITED_CODE = "rate_limited";

/** Thrown from `authorize`; the log-in action maps its `code` to a message. */
class RateLimitedSignin extends CredentialsSignin {
  code = RATE_LIMITED_CODE;
}

/**
 * The caller's IP: the first `x-forwarded-for` hop, which the hosting proxy
 * sets. Only trustworthy behind a proxy that overwrites the header — a client
 * reaching the app directly could forge it (security.md §3).
 */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // An update can be triggered by anyone holding the cookie, with any
    // payload, by POSTing to /api/auth/session. So the payload is ignored and
    // the username is re-read from the database: the token only ever carries
    // the username the user actually owns.
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);
      if (params.trigger === "update" && typeof token.id === "string") {
        token.username = await getUsername(token.id);
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // Reachable by direct POST to /api/auth/callback/credentials, not just
      // through the log-in action — so validation and the rate limit live
      // here, where every path goes through them.
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Two counters (security.md §3): per account is the strict one,
        // per IP stops one address walking the user list. Checked before
        // hashing, so a blocked attempt costs no argon2 work.
        const [byEmail, byIp] = await Promise.all([
          consumeRateLimit(`login:email:${email}`, 5, 15 * MINUTE_MS),
          consumeRateLimit(
            `login:ip:${clientIp(request.headers)}`,
            20,
            15 * MINUTE_MS,
          ),
        ]);
        // Same response whether or not the account exists.
        if (!byEmail.allowed || !byIp.allowed) throw new RateLimitedSignin();

        const user = await findUserForSignIn(email);
        if (!user) {
          await verifyAgainstDummy(password);
          return null;
        }
        if (!(await verifyPassword(user.passwordHash, password))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
        };
      },
    }),
  ],
  logger: {
    // A failed sign-in is an expected outcome, not an error worth a log line.
    error(error) {
      if (error instanceof CredentialsSignin) return;
      logError("auth.failed", error);
    },
  },
});
