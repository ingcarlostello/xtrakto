import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk";

// Clerk for the pages that use it: the app and sign-in. The waitlist stays out
// of it, so its visitors load no Clerk script or cookie, and a waitlist-only
// deployment needs no Clerk keys (16.0d).
export function ClerkRoot({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={AUTH_ROUTES.signIn}
      signUpUrl={AUTH_ROUTES.signUp}
      afterSignOutUrl={AUTH_ROUTES.signIn}
    >
      {children}
    </ClerkProvider>
  );
}
