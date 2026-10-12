import { z } from "zod";

import { LINK_TITLE_MAX_LENGTH, objectIdSchema, urlSchema } from "./fields";

const titleSchema = z
  .string({ error: "Enter a title" })
  .trim()
  .min(1, "Enter a title")
  .max(
    LINK_TITLE_MAX_LENGTH,
    `Use ${LINK_TITLE_MAX_LENGTH} characters or fewer.`,
  );

export const createLinkSchema = z.object({
  title: titleSchema,
  url: urlSchema,
});

export const updateLinkSchema = z.object({
  linkId: objectIdSchema,
  title: titleSchema,
  url: urlSchema,
});

export const deleteLinkSchema = z.object({ linkId: objectIdSchema });

export const setLinkVisibilitySchema = z.object({
  linkId: objectIdSchema,
  visible: z.boolean({ error: "Not found" }),
});

export const moveLinkSchema = z.object({
  linkId: objectIdSchema,
  direction: z.enum(["up", "down"], { error: "Not found" }),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type DeleteLinkInput = z.infer<typeof deleteLinkSchema>;
export type SetLinkVisibilityInput = z.infer<typeof setLinkVisibilitySchema>;
export type MoveLinkInput = z.infer<typeof moveLinkSchema>;
