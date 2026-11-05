import type { Metadata } from "next";
import { getCoverage } from "@/components/coverage-timeline/coverage.service";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyUsagePill } from "@/features/upload/components/MonthlyUsagePill";
import { PrivacyPanel } from "@/features/upload/components/PrivacyPanel";
import { SupportedFormats } from "@/features/upload/components/SupportedFormats";
import { UploadedFiles } from "@/features/upload/components/UploadedFiles";
import { UploadFlow } from "@/features/upload/components/UploadFlow";
import { UPLOAD_COPY as COPY } from "@/features/upload/upload.constants";
import { listUploadedFiles } from "@/features/upload/upload-results.service";
import {
  getMonthlyUsage,
  listUploadAccounts,
} from "@/features/upload/upload.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.title };

// docs/ui/v8-07: the month's count beside the title, the upload card with
// what follows the files sent and what the user has under it, and the
// privacy facts and the files sent beside them (below them on phones).
export default async function UploadPage() {
  const clerkUserId = await requireSignedIn();
  const [accounts, usage, files, coverage] = await Promise.all([
    listUploadAccounts(clerkUserId),
    getMonthlyUsage(clerkUserId),
    listUploadedFiles(clerkUserId),
    getCoverage(clerkUserId),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
        <MonthlyUsagePill usage={usage} />
      </div>
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col gap-5.5">
          <UploadFlow accounts={accounts} usage={usage} coverage={coverage}>
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
