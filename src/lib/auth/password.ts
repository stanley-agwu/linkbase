import "server-only";
import { hash, verify } from "@node-rs/argon2";

// argon2id (the library default) at OWASP's first recommended setting:
// 19 MiB memory, 2 iterations, 1 lane. Raising these later is safe — verify
// reads the parameters from each stored hash.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

// A real hash of a random string, computed once. Sign-in verifies against it
// when the email has no account, so a miss costs the same time as a wrong
// password and response timing doesn't reveal which emails are registered.
let dummyHash: Promise<string> | undefined;

export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hash(crypto.randomUUID(), OPTIONS);
  await verify(await dummyHash, password);
}
