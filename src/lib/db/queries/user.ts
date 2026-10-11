import "server-only";

import type { AuthUser } from "@/lib/types";

import { connectToDatabase } from "../connect";
import { User, type UserDoc } from "../models/user";

type UserFields = Pick<UserDoc, "_id" | "email" | "name">;

function toAuthUser(doc: UserFields): AuthUser {
  return { id: doc._id.toString(), email: doc.email, name: doc.name ?? null };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

/**
 * Creates the account. The unique index on `email` is what enforces
 * uniqueness; a duplicate comes back as `"taken"`, never as a Mongo error
 * (database.md §4).
 */
export async function createUser(
  email: string,
  passwordHash: string,
): Promise<{ status: "created"; user: AuthUser } | "taken"> {
  await connectToDatabase();

  try {
    const doc = await User.create({ email, passwordHash });
    return { status: "created", user: toAuthUser(doc) };
  } catch (error) {
    if (isDuplicateKeyError(error)) return "taken";
    throw error;
  }
}

/**
 * The credentials lookup — the one user read that runs before there is a
 * session, so it's keyed by email rather than a session user id. Only the
 * credentials provider's `authorize` calls it, and the hash it returns never
 * leaves the server.
 */
export async function findUserForSignIn(
  email: string,
): Promise<(AuthUser & { passwordHash: string }) | null> {
  await connectToDatabase();

  const doc = await User.findOne({ email })
    .select("email name +passwordHash")
    .lean();
  if (!doc) return null;

  return { ...toAuthUser(doc), passwordHash: doc.passwordHash };
}
