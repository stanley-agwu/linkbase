import "server-only";
import mongoose, { type Mongoose } from "mongoose";

// Read and checked once at import, so a missing variable fails at startup.
// The message names the variable, never its value (security.md §1.3).
const MONGODB_URI: string = readMongoUri();

function readMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  return uri;
}

// Survives HMR in dev and module re-evaluation between invocations in prod.
const globalForMongoose = globalThis as typeof globalThis & {
  _mongoose?: { conn: Mongoose | null; promise: Promise<Mongoose> | null };
};

const cached = (globalForMongoose._mongoose ??= { conn: null, promise: null });

/**
 * Returns the one shared connection, opening it on first use. Every query
 * function awaits this first; after the first call it's a no-op.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  cached.promise ??= mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5_000,
    bufferCommands: false,
  });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null; // let the next call retry instead of awaiting a rejected promise
    throw error;
  }

  return cached.conn;
}
