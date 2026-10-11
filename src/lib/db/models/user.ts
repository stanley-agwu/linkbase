import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from "@/lib/validation";

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  /** argon2id PHC string. `select: false` — read only by the sign-in query. */
  passwordHash: string;
  name?: string;
  /** Reserved for the email verification flow (auth.md §7). */
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    // Stored lowercase, so the unique index is case-insensitive without a
    // collation. Same limit as emailSchema in lib/validation.
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      maxlength: EMAIL_MAX_LENGTH,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, maxlength: NAME_MAX_LENGTH },
    emailVerifiedAt: { type: Date, default: null },
  },
  {
    strict: true,
    strictQuery: "throw",
    timestamps: true,
    versionKey: false,
  },
);

export const User = (mongoose.models.User ??
  mongoose.model<UserDoc>("User", userSchema)) as Model<UserDoc>;
