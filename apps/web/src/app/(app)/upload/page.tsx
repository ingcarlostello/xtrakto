import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyUsagePill } from "@/features/upload/components/MonthlyUsagePill";
import { PrivacyPanel } from "@/features/upload/components/PrivacyPanel";
import { SupportedFormats } from "@/features/upload/components/SupportedFormats";
import { UploadedFiles } from "@/features/upload/components/UploadedFiles";
import { UploadFlow } from "@/features/upload/components/UploadFlow";
import { UPLOAD_COPY as COPY } from "@/features/upload/upload.constants";
import {
  getMonthlyUsage,
  listUploadAccounts,
  listUploadedFiles,
} from "@/features/upload/upload.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.title };

// docs/ui/v8-07: the month's count beside the title, the upload card, and the
// privacy facts and the files sent beside it (below it on phones).
export default async function UploadPage() {
  const clerkUserId = await requireSignedIn();
  const [accounts, usage, files] = await Promise.all([
    listUploadAccounts(clerkUserId),
    getMonthlyUsage(clerkUserId),
    listUploadedFiles(clerkUserId),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
        <MonthlyUsagePill usage={usage} />
      </div>
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col">
          <UploadFlow accounts={accounts} usage={usage}>
            <SupportedFormats />
          </UploadFlow>
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5.5">
          <PrivacyPanel />
          <UploadedFiles jobs={files} />
        </div>
      </div>
    </>
  );
}
