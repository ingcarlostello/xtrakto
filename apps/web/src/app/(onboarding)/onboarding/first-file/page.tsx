import type { Metadata } from "next";
import { FirstFileForm } from "@/features/onboarding/components/FirstFileForm";
import { OnboardingHeader } from "@/features/onboarding/components/OnboardingHeader";
import { FIRST_FILE_COPY } from "@/features/onboarding/onboarding.constants";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: FIRST_FILE_COPY.metaTitle };

// Step 2 of 3: which file to upload first (docs/ui/v8-16).
export default async function FirstFilePage() {
  await requireSignedIn();
  return (
    <>
      <OnboardingHeader step={2} />
      <main className="flex justify-center py-8">
        <FirstFileForm />
      </main>
    </>
  );
}
