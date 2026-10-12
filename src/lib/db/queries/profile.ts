import "server-only";
import { cache } from "react";

import type { ProfileSettings } from "@/lib/types";
import type {
  UpdateAppearanceInput,
  UpdateProfileInput,
} from "@/lib/validation";

import { connectToDatabase } from "../connect";
import { Profile } from "../models/profile";

import {
  expirePublicProfile,
  PROFILE_FIELDS,
  toProfileSettings,
} from "./public-page";

/**
 * The signed-in user's profile, or the defaults if they haven't saved one.
 * Read by the dashboard layout and its pages in the same render, hence
 * `cache()`.
 */
export const getProfileSettings = cache(
  async (userId: string): Promise<ProfileSettings> => {
    await connectToDatabase();

    const doc = await Profile.findOne({ userId }).select(PROFILE_FIELDS).lean();
    return toProfileSettings(doc);
  },
);

/** Saves the given choices, creating the profile on first save. */
export async function updateAppearance(
  userId: string,
  input: UpdateAppearanceInput,
): Promise<void> {
  if (Object.keys(input).length === 0) return;
  await connectToDatabase();

  await Profile.updateOne(
    { userId },
    { $set: input },
    { upsert: true, runValidators: true },
  );
  await expirePublicProfile(userId);
}

/** Saves the display name and bio; an empty value removes the field. */
export async function updateProfileDetails(
  userId: string,
  { displayName, bio }: UpdateProfileInput,
): Promise<void> {
  await connectToDatabase();

  const set: Partial<UpdateProfileInput> = {};
  const unset: Partial<Record<keyof UpdateProfileInput, 1>> = {};
  if (displayName) set.displayName = displayName;
  else unset.displayName = 1;
  if (bio) set.bio = bio;
  else unset.bio = 1;

  await Profile.updateOne(
    { userId },
    { $set: set, $unset: unset },
    { upsert: true, runValidators: true },
  );
  await expirePublicProfile(userId);
}
