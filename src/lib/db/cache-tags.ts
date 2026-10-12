// Every cache tag name, built in one place, so the read that sets a tag and
// the write that clears it can't spell it differently (data-fetching.md §3.3).
// Build tags from the normalised (lowercase) handle: tags are case-sensitive.
export const cacheTags = {
  publicProfile: (handle: string) => `public-profile:${handle}`,
} as const;
