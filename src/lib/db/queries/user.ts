import "server-only";
import { revalidateTag } from "next/cache";

import type { AuthUser } from "@/lib/types";

import { cacheTags } from "../cache-tags";
import { connectToDatabase } from "../connect";
import { User, type UserDoc } from "../models/user";

type UserFields = Pick<UserDoc, "_id" | "email" | "name" | "username">;

function toAuthUser(doc: UserFields): AuthUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name ?? null,
    username: doc.username ?? null,
  };
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
    .select("email name username +passwordHash")
    .lean();
  if (!doc) return null;

  return { ...toAuthUser(doc), passwordHash: doc.passwordHash };
}

/** The signed-in user's username, or null until onboarding sets it. */
export async function getUsername(userId: string): Promise<string | null> {
  await connectToDatabase();

  const doc = await User.findById(userId).select("username").lean();
  return doc?.username ?? null;
}

/**
 * Whether nobody has the username yet. A hint for the onboarding field only:
 * the unique index decides, in `setUsername` (database.md §4).
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  await connectToDatabase();

  return !(await User.exists({ username }));
}

/**
 * The candidates nobody has yet, in the order given. One query for the whole
 * list. Like `isUsernameAvailable`, a hint: the unique index decides.
 */
export async function filterAvailableUsernames(
  candidates: string[],
): Promise<string[]> {
  if (candidates.length === 0) return [];
  await connectToDatabase();

  const taken = await User.find({ username: { $in: candidates } })
    .select("username")
    .lean();
  const takenSet = new Set(taken.map((doc) => doc.username));
  return candidates.filter((candidate) => !takenSet.has(candidate));
}

/**
 * Sets the username once. The filter is scoped to the user's own id and only
 * matches while no username is set, so it can't overwrite one. A duplicate
 * comes back as `"taken"`, never as a Mongo error. A visit to the handle
 * before it was claimed cached "not found", so setting it clears that
 * (data-fetching.md §3.4).
 */
export async function setUsername(
  userId: string,
  username: string,
): Promise<"set" | "taken" | "already-set"> {
  await connectToDatabase();

  try {
    const { matchedCount } = await User.updateOne(
      { _id: userId, username: { $exists: false } },
      { $set: { username } },
      { runValidators: true },
    );
    if (matchedCount !== 1) return "already-set";

    revalidateTag(cacheTags.publicProfile(username), { expire: 0 });
    return "set";
  } catch (error) {
    if (isDuplicateKeyError(error)) return "taken";
    throw error;
  }
}
