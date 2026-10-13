import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrivacyPanel } from "@/features/upload/components/PrivacyPanel";
import { SupportedFormats } from "@/features/upload/components/SupportedFormats";
import { UploadFlow } from "@/features/upload/components/UploadFlow";
import { UPLOAD_COPY as COPY } from "@/features/upload/upload.constants";
import { listUploadAccounts } from "@/features/upload/upload.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.title };

// docs/ui/v8-07: the upload card, and the privacy facts beside it (below it
// on phones).
export default async function UploadPage() {
  const clerkUserId = await requireSignedIn();
  const accounts = await listUploadAccounts(clerkUserId);
  return (
    <>
      <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col">
          <UploadFlow accounts={accounts}>
            <SupportedFormats />
          </UploadFlow>
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col">
          <PrivacyPanel />
        </div>
      </div>
    </>
  );
}
