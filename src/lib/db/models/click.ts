import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

/** One analytics event. Raw events for now; roll-up or TTL is TBD (database.md §4). */
export interface ClickDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  linkId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clickSchema = new Schema<ClickDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    linkId: { type: Schema.Types.ObjectId, ref: "Link", required: true },
  },
  {
    strict: true,
    strictQuery: "throw",
    timestamps: true,
    versionKey: false,
  },
);

// "Last 7 days" reads: one user's clicks, newest first. Its userId prefix also
// covers plain userId lookups, so no separate userId index.
clickSchema.index({ userId: 1, createdAt: -1 });

export const Click = (mongoose.models.Click ??
  mongoose.model<ClickDoc>("Click", clickSchema)) as Model<ClickDoc>;
