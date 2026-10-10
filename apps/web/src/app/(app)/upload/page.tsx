import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireSignedIn } from "@/lib/auth";

const COPY = PAGE_COPY.upload;

export const metadata: Metadata = { title: COPY.title };

// The upload screen (Phase 5.3) replaces this privacy promise.
export default async function UploadPage() {
  await requireSignedIn();
  return (
    <>
      <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
      <EmptyState title={COPY.emptyTitle} description={COPY.emptyDescription} />
    </>
  );
}
