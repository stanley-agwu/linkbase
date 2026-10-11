// QA test-database guard and reset. Never prints a connection string.
//
//   node test-db.mjs check   verify MONGODB_URI_TEST is safe to use; exit 1 if not
//   node test-db.mjs uri     print MONGODB_URI_TEST (for command substitution only)
//   node test-db.mjs reset   check, then empty every collection in the test DB
//
// Reset deletes documents but keeps collections and indexes: Mongoose builds
// indexes once per process, so dropping them mid-run would lose the unique
// email index and the rate-limit TTL index until the dev server restarts.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import mongoose from "mongoose";

const root = process.cwd();

function readEnv(file) {
  let text;
  try {
    text = readFileSync(resolve(root, file), "utf8");
  } catch {
    return {};
  }
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return env;
}

function fail(message) {
  console.error(`test-db: ${message}`);
  process.exit(1);
}

function dbName(uri) {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function host(uri) {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/);
  return match ? match[1].toLowerCase() : "";
}

function checkedTestUri() {
  const testUri = readEnv(".env.test").MONGODB_URI_TEST;
  if (!testUri) fail("MONGODB_URI_TEST is not set in .env.test");

  const devUri =
    readEnv(".env.local").MONGODB_URI ?? readEnv(".env").MONGODB_URI;
  if (devUri && devUri === testUri) {
    fail("MONGODB_URI_TEST is the same as the dev MONGODB_URI");
  }

  // user:password@host — without the "@", the driver reads the credentials as
  // host:port and every connection fails.
  const authority = testUri.match(/^mongodb(?:\+srv)?:\/\/([^/?]*)/)?.[1] ?? "";
  if (!authority.includes("@")) {
    fail(
      'MONGODB_URI_TEST has no "@host" part — expected mongodb+srv://<user>:<password>@<host>/<database>',
    );
  }
  if (testUri.startsWith("mongodb+srv://") && host(testUri).includes(":")) {
    fail(
      "MONGODB_URI_TEST is a mongodb+srv URI with a port; srv hosts take none (if the password has special characters, URL-encode them)",
    );
  }

  const name = dbName(testUri);
  if (!name)
    fail(
      "MONGODB_URI_TEST names no database (it would default to 'test' on a shared cluster)",
    );
  if (!/test/i.test(name))
    fail(`test database name "${name}" must contain "test"`);
  // A URI without a database name uses Mongo's default, "test".
  const devName = devUri ? dbName(devUri) || "test" : "";
  if (devUri && devName === name && host(devUri) === host(testUri)) {
    fail("MONGODB_URI_TEST points at the same database as the dev MONGODB_URI");
  }
  return { uri: testUri, name };
}

const command = process.argv[2];

if (command === "check") {
  const { name } = checkedTestUri();
  console.log(`test-db: ok — database "${name}"`);
} else if (command === "uri") {
  process.stdout.write(checkedTestUri().uri);
} else if (command === "reset") {
  const { uri, name } = checkedTestUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  const db = mongoose.connection.db;
  if (!db || db.databaseName !== name)
    fail("connected to an unexpected database");
  const collections = await db.collections();
  for (const collection of collections) await collection.deleteMany({});
  await mongoose.disconnect();
  console.log(
    `test-db: reset ${collections.length} collection(s) in "${name}"`,
  );
} else {
  fail("usage: node test-db.mjs <check|uri|reset>");
}
