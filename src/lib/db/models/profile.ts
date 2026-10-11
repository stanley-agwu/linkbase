import "server-only";
import { Schema, type Types } from "mongoose";

import { defineModel } from "./define-model";

export interface ProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  displayName: string;
  bio?: string;
  themeId: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<ProfileDoc>(
  {
    // No handle here: the public URL is the owner's User.username, so the
    // public read finds the user by username, then this profile by userId.
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
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

export const Profile = defineModel<ProfileDoc>("Profile", profileSchema);
