import type { Metadata } from "next";
import { OnboardingHeader } from "@/features/onboarding/components/OnboardingHeader";
import { WelcomeStep } from "@/features/onboarding/components/WelcomeStep";
import { WELCOME_COPY } from "@/features/onboarding/onboarding.constants";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: WELCOME_COPY.metaTitle };

// Step 1 of 3, where Clerk sends a new account (docs/ui/v8-15).
export default async function WelcomePage() {
  await requireSignedIn();
  return (
    <>
      <OnboardingHeader step={1} />
      <main className="flex flex-1 items-center py-8 lg:py-12">
        <WelcomeStep />
      </main>
    </>
  );
}
