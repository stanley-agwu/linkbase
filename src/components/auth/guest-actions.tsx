import { ButtonLink } from "@/components/ui/button";

type GuestActionsProps = {
  /** `bar`: inline in the nav. `drawer`: full-width, in the mobile menu. */
  placement?: "bar" | "drawer";
};

/** Log in / Sign up, for visitors without a session. */
export function GuestActions({ placement = "bar" }: GuestActionsProps) {
  if (placement === "drawer") {
    return (
      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink
          href="/login"
          variant="soft"
          fullWidth
          className="flex-[1_1_140px]"
        >
          Log in
        </ButtonLink>
        <ButtonLink
          href="/signup"
          variant="dark"
          fullWidth
          className="flex-[1_1_140px]"
        >
          Sign up free
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <ButtonLink href="/login" variant="soft" className="max-[639px]:hidden">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup" variant="dark">
        <span className="max-[639px]:hidden">Sign up free</span>
        <span className="min-[640px]:hidden">Sign up</span>
      </ButtonLink>
    </div>
  );
}
