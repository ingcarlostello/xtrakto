import { ClerkRoot } from "@/components/layout/ClerkRoot";
import { requireSignedIn } from "@/lib/auth";

// The welcome after sign-up (5.8): signed in, without the app's header and
// dock, in the waitlist's 1120px column. Clerk keeps the session fresh while
// a step is open, before the upload screen asks for it.
export default async function OnboardingLayout({
  children,
}: LayoutProps<"/onboarding">) {
  await requireSignedIn();
  return (
    <ClerkRoot>
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 pb-10 sm:px-7">
        {children}
      </div>
    </ClerkRoot>
  );
}
