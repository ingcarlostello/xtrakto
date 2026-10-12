import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { UploadFlow } from "@/features/upload/components/UploadFlow";
import { UPLOAD_COPY as COPY } from "@/features/upload/upload.constants";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.title };

export default async function UploadPage() {
  await requireSignedIn();
  return (
    <>
      <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
      <UploadFlow />
    </>
  );
}
