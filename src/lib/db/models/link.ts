import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface LinkDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
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
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    // Limits match the link schemas in lib/validation (errors-and-validation.md §2.3).
    title: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
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

// The editor's ordered list, and the public page's visible links in order.
linkSchema.index({ userId: 1, order: 1 });
linkSchema.index({ profileId: 1, visible: 1, order: 1 });

export const Link = (mongoose.models.Link ??
  mongoose.model<LinkDoc>("Link", linkSchema)) as Model<LinkDoc>;
