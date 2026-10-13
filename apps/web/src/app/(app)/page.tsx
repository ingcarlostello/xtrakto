import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { HowItWorks } from "@/features/upload/components/HowItWorks";
import { requireSignedIn } from "@/lib/auth";

const COPY = PAGE_COPY.summary;

export const metadata: Metadata = { title: COPY.title };

// Before the first upload (docs/ui/v8-12): what uploading brings, and the
// bank's download paths beside it. The summary page (Phase 6.7) replaces it.
export default async function SummaryPage() {
  await requireSignedIn();
  return (
    <>
      <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col">
          <EmptyState
            title={COPY.emptyTitle}
            description={COPY.emptyDescription}
            action={<UploadStatementLink />}
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col">
          <HowItWorks />
        </div>
      </div>
    </>
  );
}
