"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/** Opens Clerk's own profile, where the user changes how they sign in. */
export function ManageSignInButton({ label }: { label: string }) {
  const { openUserProfile } = useClerk();
  return (
    <Button
      variant="secondary"
      className="self-start sm:self-center"
      onClick={() => openUserProfile()}
    >
      {label}
    </Button>
  );
}
