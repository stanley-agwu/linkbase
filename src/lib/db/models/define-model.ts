import "server-only";
import mongoose, { type Model, type Schema } from "mongoose";

/**
 * Registers a model once per process. Mongoose's registry outlives a hot
 * reload, so the usual `mongoose.models.X ?? mongoose.model(...)` keeps serving
 * the schema the dev server started with: a field added since then is
 * "not in schema" and its index is never built. In development the old
 * registration is replaced each time the model file runs; in production a
 * model file runs once, so the existing registration is reused.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return (mongoose.models[name] ?? mongoose.model<T>(name, schema)) as Model<T>;
}
