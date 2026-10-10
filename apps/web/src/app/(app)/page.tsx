import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireSignedIn } from "@/lib/auth";

const COPY = PAGE_COPY.summary;

export const metadata: Metadata = { title: COPY.title };

// The summary page (Phase 6.7) replaces this empty state.
export default async function SummaryPage() {
  await requireSignedIn();
  return (
    <>
      <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
      <EmptyState
        title={COPY.emptyTitle}
        description={COPY.emptyDescription}
        action={<UploadStatementLink />}
      />
    </>
  );
}
