import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsSetting } from "@/features/analytics/components/AnalyticsSetting";
import { DeleteAccountSection } from "@/features/users/components/DeleteAccountSection";
import { DownloadDataSection } from "@/features/users/components/DownloadDataSection";
import { SETTINGS_COPY } from "@/features/users/user.constants";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

export default async function SettingsPage() {
  await requireSignedIn();
  return (
    <>
      <PageHeader
        title={SETTINGS_COPY.title}
        subtitle={SETTINGS_COPY.subtitle}
      />
      <AnalyticsSetting />
      <DownloadDataSection />
      <DeleteAccountSection />
    </>
  );
}
