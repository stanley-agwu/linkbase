import { verifySession } from "@/lib/auth";

import { GuestActions } from "./guest-actions";
import { UserMenu } from "./user-menu";

type HeaderAccountProps = {
  placement?: "bar" | "drawer";
};

/**
 * The header's account slot. Reads the session (a cookie decode, no database
 * read), so render it inside `<Suspense>` to keep the rest of the header
 * from waiting on it (auth.md §2).
 */
export async function HeaderAccount({ placement = "bar" }: HeaderAccountProps) {
  const session = await verifySession();

  if (!session) return <GuestActions placement={placement} />;
  // Signed in, the account lives in the bar; the drawer has nothing to add.
  if (placement === "drawer") return null;

  // Only what the menu renders crosses to the client.
  return <UserMenu user={{ name: session.name, email: session.email }} />;
}
