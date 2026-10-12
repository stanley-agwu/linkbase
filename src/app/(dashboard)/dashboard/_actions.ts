"use server";

import { refresh } from "next/cache";

import { requireUserId } from "@/lib/auth";
import {
  consumeRateLimit,
  createLink as createLinkRow,
  deleteLink as deleteLinkRow,
  MAX_LINKS_PER_USER,
  moveLink as moveLinkRow,
  setLinkVisibility as setLinkVisibilityRow,
  updateLink as updateLinkRow,
  updateProfileDetails,
} from "@/lib/db";
import type { DashboardLink } from "@/lib/types";
import {
  type ActionResult,
  type CreateLinkInput,
  createLinkSchema,
  type DeleteLinkInput,
  deleteLinkSchema,
  formError,
  type MoveLinkInput,
  moveLinkSchema,
  type SetLinkVisibilityInput,
  setLinkVisibilitySchema,
  type UpdateLinkInput,
  updateLinkSchema,
  type UpdateProfileInput,
  updateProfileSchema,
  validationError,
} from "@/lib/validation";

const MINUTE_MS = 60 * 1000;

// The lib/db writes clear the public page's cache tag themselves
// (data-fetching.md §3.4); each action re-renders the dashboard with
// refresh(), since private reads aren't cached.

export async function createLink(
  _previous: ActionResult<CreateLinkInput, DashboardLink>,
  formData: FormData,
): Promise<ActionResult<CreateLinkInput, DashboardLink>> {
  const userId = await requireUserId();

  const parsed = createLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  // Per user, plus the total cap in createLinkRow (security.md §3).
  const { allowed } = await consumeRateLimit(
    `link-create:${userId}`,
    30,
    MINUTE_MS,
  );
  if (!allowed) {
    return formError("Too many links added. Try again in a moment.", formData);
  }

  const link = await createLinkRow(userId, parsed.data);
  if (link === "limit") {
    return formError(
      `You’ve reached the ${MAX_LINKS_PER_USER}-link limit.`,
      formData,
    );
  }

  refresh();
  return { status: "success", data: link };
}

export async function updateLink(
  _previous: ActionResult<UpdateLinkInput, DashboardLink>,
  formData: FormData,
): Promise<ActionResult<UpdateLinkInput, DashboardLink>> {
  const userId = await requireUserId();

  const parsed = updateLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const link = await updateLinkRow(userId, parsed.data);
  if (!link) return formError("Not found", formData);

  refresh();
  return { status: "success", data: link };
}

export async function deleteLink(
  _previous: ActionResult<DeleteLinkInput>,
  formData: FormData,
): Promise<ActionResult<DeleteLinkInput>> {
  const userId = await requireUserId();

  const parsed = deleteLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const deleted = await deleteLinkRow(userId, parsed.data.linkId);
  if (!deleted) return formError("Not found", formData);

  refresh();
  return { status: "success", data: null };
}

export async function updateProfile(
  _previous: ActionResult<UpdateProfileInput>,
  formData: FormData,
): Promise<ActionResult<UpdateProfileInput>> {
  const userId = await requireUserId();

  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  await updateProfileDetails(userId, parsed.data);

  refresh();
  return { status: "success", data: null };
}

// Called from event handlers rather than forms (data-mutations.md §6.2), so
// there's no FormData to echo back. Any failure, a malformed id included,
// reads the same as a link that isn't the caller's (auth.md §5).
function notFound<TInput>(): ActionResult<TInput> {
  return {
    status: "error",
    fieldErrors: {},
    formError: "Not found",
    values: {},
  };
}

export async function setLinkVisibility(
  linkId: string,
  visible: boolean,
): Promise<ActionResult<SetLinkVisibilityInput>> {
  const userId = await requireUserId();

  const parsed = setLinkVisibilitySchema.safeParse({ linkId, visible });
  if (!parsed.success) return notFound();

  const updated = await setLinkVisibilityRow(
    userId,
    parsed.data.linkId,
    parsed.data.visible,
  );
  if (!updated) return notFound();

  refresh();
  return { status: "success", data: null };
}

export async function moveLink(
  linkId: string,
  direction: "up" | "down",
): Promise<ActionResult<MoveLinkInput>> {
  const userId = await requireUserId();

  const parsed = moveLinkSchema.safeParse({ linkId, direction });
  if (!parsed.success) return notFound();

  const outcome = await moveLinkRow(userId, parsed.data);
  if (outcome === "not-found") return notFound();

  // "edge" is a no-op: the arrow is disabled there, so only a stale render
  // or a direct call gets here. Refresh either way to show the real order.
  refresh();
  return { status: "success", data: null };
}
