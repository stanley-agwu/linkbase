import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from "@/lib/validation";

export interface ProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  handle: string;
  displayName: string;
  bio?: string;
  themeId: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<ProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // Same rule as handleSchema in lib/validation (errors-and-validation.md §8).
    handle: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      minlength: HANDLE_MIN_LENGTH,
      maxlength: HANDLE_MAX_LENGTH,
      match: /^[a-z0-9._]+$/,
    },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    bio: { type: String, trim: true, maxlength: 160 },
    themeId: { type: String, required: true, default: "default" },
    published: { type: Boolean, required: true, default: false },
  },
  {
    strict: true,
    strictQuery: "throw",
    timestamps: true,
    versionKey: false,
  },
);

export const Profile = (mongoose.models.Profile ??
  mongoose.model<ProfileDoc>("Profile", profileSchema)) as Model<ProfileDoc>;
