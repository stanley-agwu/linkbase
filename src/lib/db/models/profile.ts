import "server-only";
import { Schema, type Types } from "mongoose";

import type { ButtonShape, ProfileFont, ThemeId } from "@/lib/types";
import {
  BIO_MAX_LENGTH,
  BUTTON_SHAPES,
  DISPLAY_NAME_MAX_LENGTH,
  PROFILE_FONTS,
  THEME_IDS,
} from "@/lib/validation";

import { defineModel } from "./define-model";

export interface ProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Shown instead of `@username` when set. */
  displayName?: string;
  bio?: string;
  themeId: ThemeId;
  buttonShape: ButtonShape;
  font: ProfileFont;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<ProfileDoc>(
  {
    // No handle here: the public URL is the owner's User.username, so the
    // public read finds the user by username, then this profile by userId.
    // Created on the first save (an upsert), so a user may have none; the
    // reads fall back to the defaults below.
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // Limits match updateProfileSchema in lib/validation.
    displayName: {
      type: String,
      trim: true,
      maxlength: DISPLAY_NAME_MAX_LENGTH,
    },
    bio: { type: String, trim: true, maxlength: BIO_MAX_LENGTH },
    themeId: { type: String, required: true, enum: THEME_IDS, default: "kiln" },
    buttonShape: {
      type: String,
      required: true,
      enum: BUTTON_SHAPES,
      default: "template",
    },
    font: {
      type: String,
      required: true,
      enum: PROFILE_FONTS,
      default: "template",
    },
  },
  {
    strict: true,
    strictQuery: "throw",
    timestamps: true,
    versionKey: false,
  },
);

export const Profile = defineModel<ProfileDoc>("Profile", profileSchema);
