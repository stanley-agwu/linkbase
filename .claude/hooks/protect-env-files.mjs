import { readFileSync } from "node:fs";
import path from "node:path";

const PROTECTED = new Set([".env", ".env.local"]);

const input = JSON.parse(readFileSync(0, "utf8"));
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "";

if (PROTECTED.has(path.basename(target))) {
  // Exit code 2 tells Claude Code to block the tool call; stderr is shown to Claude as the reason.
  process.stderr.write(`${path.basename(target)} is protected. Ask the user before editing it.\n`);
  process.exit(2);
}
