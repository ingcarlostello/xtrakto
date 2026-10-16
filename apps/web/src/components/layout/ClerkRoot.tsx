import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { AUTH_ROUTES, ONBOARDING_ROUTE } from "@/lib/auth-routes";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk";

// Clerk for the pages that use it: the app, the welcome and sign-in. The
// waitlist stays out of it, so its visitors load no Clerk script or cookie,
// and a waitlist-only deployment needs no Clerk keys (16.0d). A new account
// always lands on the welcome, whatever page sent it to sign up; nothing
// records that it was seen.
export function ClerkRoot({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={AUTH_ROUTES.signIn}
      signUpUrl={AUTH_ROUTES.signUp}
      signUpForceRedirectUrl={ONBOARDING_ROUTE}
      afterSignOutUrl={AUTH_ROUTES.signIn}
    >
      {children}
    </ClerkProvider>
  );
}
