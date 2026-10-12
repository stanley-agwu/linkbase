import "server-only";
import { Schema, type Types } from "mongoose";

import { LINK_TITLE_MAX_LENGTH, LINK_URL_MAX_LENGTH } from "@/lib/validation";

import { defineModel } from "./define-model";

export interface LinkDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  url: string;
  visible: boolean;
  order: number;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const linkSchema = new Schema<LinkDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Limits match the link schemas in lib/validation (errors-and-validation.md §2.3).
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: LINK_TITLE_MAX_LENGTH,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: LINK_URL_MAX_LENGTH,
    },
    visible: { type: Boolean, required: true, default: true },
    order: { type: Number, required: true, min: 0 },
    clickCount: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    strict: true,
    strictQuery: "throw",
    timestamps: true,
    versionKey: false,
  },
);

// The dashboard's ordered list, and the public page's visible links in order.
// A profile is one per user, so the public read finds links by its owner's
// userId rather than a profileId.
linkSchema.index({ userId: 1, order: 1 });
linkSchema.index({ userId: 1, visible: 1, order: 1 });

export const Link = defineModel<LinkDoc>("Link", linkSchema);
