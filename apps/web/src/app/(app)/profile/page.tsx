import type { Metadata } from "next";
import { getYourData } from "@/components/coverage-timeline/coverage.service";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsSetting } from "@/features/analytics/components/AnalyticsSetting";
import { hasUsedUpAiMonth } from "@/features/llm-usage/llm-usage.service";
import { getMonthlyUsage } from "@/features/upload/upload.service";
import { NoticesSetting } from "@/features/notices/components/NoticesSetting";
import { getNoticePreferences } from "@/features/notices/notices.service";
import { BankName } from "@/features/users/components/BankName";
import { PrivacyAndData } from "@/features/users/components/PrivacyAndData";
import { ProfilePlan } from "@/features/users/components/ProfilePlan";
import { ProfileSession } from "@/features/users/components/ProfileSession";
import { XtraktoAccount } from "@/features/users/components/XtraktoAccount";
import { YourAccounts } from "@/features/users/components/YourAccounts";
import { YourData } from "@/features/users/components/YourData";
import { PROFILE_COPY } from "@/features/users/user.constants";
import {
  getProfileAccount,
  getYourAccounts,
} from "@/features/users/user.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: PROFILE_COPY.title };

// "Tu perfil" (docs/ui/v8-11): the main column and the side one, which
// phones stack.
export default async function ProfilePage() {
  const clerkUserId = await requireSignedIn();
  const [account, yours, data, usage, isAiUsedUp, notices] = await Promise.all([
    getProfileAccount(clerkUserId),
    getYourAccounts(clerkUserId),
    getYourData(clerkUserId),
    getMonthlyUsage(clerkUserId),
    hasUsedUpAiMonth(clerkUserId),
    getNoticePreferences(clerkUserId),
  ]);
  return (
    <>
      <PageHeader title={PROFILE_COPY.title} subtitle={PROFILE_COPY.subtitle} />
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col gap-5.5">
          <XtraktoAccount account={account} />
          <BankName {...yours} />
          <YourAccounts {...yours} />
          <YourData {...data} />
          <PrivacyAndData />
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5.5">
          <ProfilePlan {...usage} isAiUsedUp={isAiUsedUp} />
          <NoticesSetting {...notices} />
          <AnalyticsSetting />
          <ProfileSession lastSignIn={account.lastSignIn} />
        </div>
      </div>
    </>
  );
}
