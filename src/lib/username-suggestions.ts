import { HANDLE_MAX_LENGTH, handleSchema } from "@/lib/validation";

// Tried in this order, so the first suggestions read like a person's choice
// ("marastudio", "themara") and the numbered ones are the fallback.
const AFFIXES: ReadonlyArray<readonly [prefix: string, suffix: string]> = [
  ["", "studio"],
  ["the", ""],
  ["", "hq"],
  ["", "_official"],
  ["its", ""],
  ["", "-me"],
  ...Array.from({ length: 9 }, (_, i) => ["", String(i + 1)] as const),
];

/**
 * Alternatives to a taken username, in preference order. Every one passes
 * `handleSchema`: the base is shortened to make room for the affix, so a
 * 30-character name still gets suggestions. Whether they're free is for the
 * database to say; this only proposes.
 */
export function usernameCandidates(username: string): string[] {
  const candidates = new Set<string>();

  for (const [prefix, suffix] of AFFIXES) {
    const room = HANDLE_MAX_LENGTH - prefix.length - suffix.length;
    const candidate = `${prefix}${username.slice(0, room)}${suffix}`;
    if (candidate !== username && handleSchema.safeParse(candidate).success) {
      candidates.add(candidate);
    }
  }

  return [...candidates];
}
