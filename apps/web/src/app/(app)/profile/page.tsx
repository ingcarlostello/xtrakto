import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsSetting } from "@/features/analytics/components/AnalyticsSetting";
import { PrivacyAndData } from "@/features/users/components/PrivacyAndData";
import { PROFILE_COPY } from "@/features/users/user.constants";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: PROFILE_COPY.title };

// "Tu perfil" (docs/ui/v8-11): the main column and the side one, which
// phones stack.
export default async function ProfilePage() {
  await requireSignedIn();
  return (
    <>
      <PageHeader title={PROFILE_COPY.title} subtitle={PROFILE_COPY.subtitle} />
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col gap-5.5">
          <PrivacyAndData />
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5.5">
          <AnalyticsSetting />
        </div>
      </div>
    </>
  );
}
