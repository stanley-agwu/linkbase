import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";

import type { ProfileSettings, PublicPage } from "@/lib/types";

import { cacheTags } from "../cache-tags";
import { connectToDatabase } from "../connect";
import { Link } from "../models/link";
import { Profile, type ProfileDoc } from "../models/profile";
import { User } from "../models/user";

export const PROFILE_FIELDS = "displayName bio themeId buttonShape font";

type ProfileFields = Pick<
  ProfileDoc,
  "displayName" | "bio" | "themeId" | "buttonShape" | "font"
>;

/** A saved profile, or the defaults for an owner who hasn't saved one yet. */
export function toProfileSettings(doc: ProfileFields | null): ProfileSettings {
  return {
    displayName: doc?.displayName || null,
    bio: doc?.bio || null,
    themeId: doc?.themeId ?? "kiln",
    buttonShape: doc?.buttonShape ?? "template",
    font: doc?.font ?? "template",
  };
}

/**
 * The one unscoped read (database.md §5): any visitor, by handle. A page is
 * live once its owner has a username; there's no publish step. Projects only
 * what the page renders — never the userId, the email, or hidden links.
 */
async function readPublicPage(handle: string): Promise<PublicPage | null> {
  await connectToDatabase();

  const owner = await User.findOne({ username: handle })
    .select("_id username")
    .lean();
  if (!owner?.username) return null;

  const [profile, links] = await Promise.all([
    Profile.findOne({ userId: owner._id }).select(PROFILE_FIELDS).lean(),
    Link.find({ userId: owner._id, visible: true })
      .select("title url")
      .sort({ order: 1 })
      .lean(),
  ]);

  return {
    username: owner.username,
    ...toProfileSettings(profile),
    links: links.map((link) => ({
      id: link._id.toString(),
      title: link.title,
      url: link.url,
    })),
  };
}

/**
 * Cached across requests under the handle's tag (data-fetching.md §3.2), and
 * deduplicated within one render so the page and its metadata share a read.
 * `null` is cached too, which is why choosing a username clears the tag.
 */
export const getPublicPage = cache((handle: string) =>
  unstable_cache(readPublicPage, ["public-page", handle], {
    tags: [cacheTags.publicProfile(handle)],
  })(handle),
);

/**
 * Clears the owner's cached public page after a write that changes it. Called
 * by the write functions themselves, so no caller can write without it
 * (data-fetching.md §3.4).
 */
export async function expirePublicProfile(userId: string): Promise<void> {
  const owner = await User.findById(userId).select("username").lean();
  if (owner?.username) {
    revalidateTag(cacheTags.publicProfile(owner.username), { expire: 0 });
  }
}
