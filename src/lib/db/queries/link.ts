import "server-only";

import type { DashboardLink } from "@/lib/types";
import type {
  CreateLinkInput,
  MoveLinkInput,
  UpdateLinkInput,
} from "@/lib/validation";

import { connectToDatabase } from "../connect";
import { Click } from "../models/click";
import { Link, type LinkDoc } from "../models/link";

/** The hard cap on links per account (security.md §3). */
export const MAX_LINKS_PER_USER = 100;

const DAY_MS = 24 * 60 * 60 * 1000;
const LINK_FIELDS = "title url visible clickCount";

type LinkFields = Pick<
  LinkDoc,
  "_id" | "title" | "url" | "visible" | "clickCount"
>;

function toLink(doc: LinkFields): DashboardLink {
  return {
    id: doc._id.toString(),
    title: doc.title,
    url: doc.url,
    visible: doc.visible,
    clicks: doc.clickCount,
  };
}

/** The signed-in user's links, in their display order. */
export async function listLinks(userId: string): Promise<DashboardLink[]> {
  await connectToDatabase();

  const docs = await Link.find({ userId })
    .select(LINK_FIELDS)
    .sort({ order: 1 })
    .lean();
  return docs.map(toLink);
}

/**
 * Appends a link after the user's last one. Returns `"limit"` at the cap
 * instead of writing. The count and the insert aren't atomic, so two
 * simultaneous adds at 99 can both land; the per-minute rate limit in the
 * action keeps that overshoot to a handful.
 */
export async function createLink(
  userId: string,
  input: CreateLinkInput,
): Promise<DashboardLink | "limit"> {
  await connectToDatabase();

  const [count, last] = await Promise.all([
    Link.countDocuments({ userId }),
    Link.findOne({ userId }).select("order").sort({ order: -1 }).lean(),
  ]);
  if (count >= MAX_LINKS_PER_USER) return "limit";

  const doc = await Link.create({
    userId,
    title: input.title,
    url: input.url,
    order: last ? last.order + 1 : 0,
  });
  return toLink(doc);
}

/** Returns `null` when the link doesn't exist or isn't this user's. */
export async function updateLink(
  userId: string,
  input: UpdateLinkInput,
): Promise<DashboardLink | null> {
  await connectToDatabase();

  const doc = await Link.findOneAndUpdate(
    { _id: input.linkId, userId },
    { $set: { title: input.title, url: input.url } },
    { returnDocument: "after", runValidators: true },
  )
    .select(LINK_FIELDS)
    .lean();
  return doc ? toLink(doc) : null;
}

/**
 * Deletes the link and its click events together (data-mutations.md §7).
 * Returns `false` when the link doesn't exist or isn't this user's.
 */
export async function deleteLink(
  userId: string,
  linkId: string,
): Promise<boolean> {
  const { connection } = await connectToDatabase();

  return connection.transaction(async (session) => {
    const { deletedCount } = await Link.deleteOne(
      { _id: linkId, userId },
      { session },
    );
    if (deletedCount === 0) return false;

    await Click.deleteMany({ linkId, userId }, { session });
    return true;
  });
}

/** Returns `false` when the link doesn't exist or isn't this user's. */
export async function setLinkVisibility(
  userId: string,
  linkId: string,
  visible: boolean,
): Promise<boolean> {
  await connectToDatabase();

  const { matchedCount } = await Link.updateOne(
    { _id: linkId, userId },
    { $set: { visible } },
  );
  return matchedCount > 0;
}

/**
 * Swaps the link's position with its neighbour in `direction`. Both reads and
 * both writes are scoped to the user and run in one transaction, so a
 * concurrent move can't leave two links on the same position.
 */
export async function moveLink(
  userId: string,
  { linkId, direction }: MoveLinkInput,
): Promise<"moved" | "edge" | "not-found"> {
  const { connection } = await connectToDatabase();

  return connection.transaction(async (session) => {
    const link = await Link.findOne({ _id: linkId, userId })
      .select("order")
      .session(session)
      .lean();
    if (!link) return "not-found";

    const up = direction === "up";
    const neighbour = await Link.findOne({
      userId,
      order: up ? { $lt: link.order } : { $gt: link.order },
    })
      .select("order")
      .sort({ order: up ? -1 : 1 })
      .session(session)
      .lean();
    if (!neighbour) return "edge";

    await Link.bulkWrite(
      [
        {
          updateOne: {
            filter: { _id: link._id, userId },
            update: { $set: { order: neighbour.order } },
          },
        },
        {
          updateOne: {
            filter: { _id: neighbour._id, userId },
            update: { $set: { order: link.order } },
          },
        },
      ],
      { session },
    );
    return "moved";
  });
}

/** Click events on the user's links in the last `days` days. */
export async function countRecentClicks(
  userId: string,
  days: number,
): Promise<number> {
  await connectToDatabase();

  return Click.countDocuments({
    userId,
    createdAt: { $gte: new Date(Date.now() - days * DAY_MS) },
  });
}
