import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicPage } from "@/lib/db";
import { handleSchema } from "@/lib/validation";
import { PublicProfile } from "@/components/profile/public-profile";

import { TrackedLink } from "./_components/public-link";

/**
 * A malformed handle is a missing page, not a query (data-fetching.md §2.2).
 * The same `getPublicPage` call in the page and its metadata is one read.
 */
async function loadPage(params: PageProps<"/user/[handle]">["params"]) {
  const parsed = handleSchema.safeParse((await params).handle);
  if (!parsed.success) return null;
  return getPublicPage(parsed.data);
}

export async function generateMetadata({
  params,
}: PageProps<"/user/[handle]">): Promise<Metadata> {
  const page = await loadPage(params);
  if (!page) return { title: "Page not found" };

  return {
    title: page.displayName ?? `@${page.username}`,
    description: page.bio ?? `@${page.username} on Linkbase`,
  };
}

/**
 * The public profile: no session read, so it's identical for every visitor
 * and its data is cached across requests. Unknown and malformed handles look
 * the same.
 */
export default async function UserPage({
  params,
}: PageProps<"/user/[handle]">) {
  const page = await loadPage(params);
  if (!page) notFound();

  return (
    <PublicProfile
      page={page}
      renderLink={(link, theme) => (
        <TrackedLink linkId={link.id} href={link.url} theme={theme}>
          {link.title}
        </TrackedLink>
      )}
    />
  );
}
