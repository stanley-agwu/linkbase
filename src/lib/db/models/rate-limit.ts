import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

/** One fixed-window counter per key, e.g. `login:email:jane@example.com`. */
export interface RateLimitDoc {
  _id: Types.ObjectId;
  key: string;
  count: number;
  /** End of the current window. The TTL index deletes the document after it. */
  expiresAt: Date;
}

const rateLimitSchema = new Schema<RateLimitDoc>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, min: 0 },
    // The TTL monitor runs about once a minute, so an expired document can
    // linger briefly — consumeRateLimit resets those itself.
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  // No timestamps: the counter is write-hot and expiresAt is its only date.
  { strict: true, strictQuery: "throw", versionKey: false },
);

export const RateLimit = (mongoose.models.RateLimit ??
  mongoose.model<RateLimitDoc>(
    "RateLimit",
    rateLimitSchema,
  )) as Model<RateLimitDoc>;
