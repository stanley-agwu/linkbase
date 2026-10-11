import "server-only";
import { Schema, type Types } from "mongoose";

import {
  EMAIL_MAX_LENGTH,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_PATTERN,
  NAME_MAX_LENGTH,
} from "@/lib/validation";

import { defineModel } from "./define-model";

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  /** argon2id PHC string. `select: false` — read only by the sign-in query. */
  passwordHash: string;
  name?: string;
  /**
   * Chosen once, during onboarding; absent until then. Also the public
   * /user/[handle] URL. Same rule as handleSchema in lib/validation.
   */
  username?: string;
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
    // Unique, and the index /user/[handle] looks up by. Sparse, so the
    // accounts that haven't chosen one yet don't collide on a missing value.
    // Stored lowercase against a lowercase-only pattern, so uniqueness is
    // case-insensitive without a collation (database.md §4).
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: HANDLE_MIN_LENGTH,
      maxlength: HANDLE_MAX_LENGTH,
      match: HANDLE_PATTERN,
    },
    emailVerifiedAt: { type: Date, default: null },
  },
  {
    strict: true,
    strictQuery: "throw",
    timestamps: true,
    versionKey: false,
  },
);

export const User = defineModel<UserDoc>("User", userSchema);
