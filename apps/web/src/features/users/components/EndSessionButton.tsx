"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { SESSION_COPY as COPY } from "../user.constants";

/**
 * "Cerrar sesión": Clerk ends the session in this browser and opens
 * sign-in. While it does, the button keeps its focus and says so.
 */
export function EndSessionButton() {
  const { signOut } = useClerk();
  const [isPending, setIsPending] = useState(false);
  const endSession = async () => {
    setIsPending(true);
    // Should Clerk fail, the button can be pressed again.
    await signOut({ redirectUrl: AUTH_ROUTES.signIn }).catch(() =>
      setIsPending(false),
    );
  };
  return (
    <Button
      variant="secondary"
      className="self-start"
      onClick={endSession}
      disabled={isPending}
      focusableWhenDisabled
    >
      <LogOut aria-hidden strokeWidth={2.2} />
      {isPending ? COPY.signingOut : COPY.signOut}
    </Button>
  );
}
