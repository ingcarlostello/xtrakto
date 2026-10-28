import type { Metadata } from "next";
import { ExampleInvite } from "@/features/example/components/ExampleInvite";
import { DownloadGuides } from "@/features/onboarding/components/DownloadGuides";
import { OnboardingHeader } from "@/features/onboarding/components/OnboardingHeader";
import {
  DOWNLOAD_COPY,
  FIRST_FILE_PARAM,
} from "@/features/onboarding/onboarding.constants";
import { firstFileSchema } from "@/features/onboarding/onboarding.schemas";
import { UploadShortcut } from "@/features/upload/components/UploadShortcut";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: DOWNLOAD_COPY.metaTitle };

// Step 3 of 3 (docs/ui/v8-17): where to get the files, beside a drop zone
// that takes them to the upload screen, and the example for whoever doesn't
// have them at hand. Below it on phones.
export default async function DownloadPage({
  searchParams,
}: PageProps<"/onboarding/download">) {
  await requireSignedIn();
  const first = firstFileSchema.parse((await searchParams)[FIRST_FILE_PARAM]);
  return (
    <>
      <OnboardingHeader step={3} />
      <main className="grid items-start gap-5.5 py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <DownloadGuides first={first} />
        <UploadShortcut title={DOWNLOAD_COPY.uploadHere}>
          <ExampleInvite />
        </UploadShortcut>
      </main>
    </>
  );
}
