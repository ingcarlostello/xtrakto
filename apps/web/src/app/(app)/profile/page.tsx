import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsSetting } from "@/features/analytics/components/AnalyticsSetting";
import { getMonthlyUsage } from "@/features/upload/upload.service";
import { BankName } from "@/features/users/components/BankName";
import { PrivacyAndData } from "@/features/users/components/PrivacyAndData";
import { ProfilePlan } from "@/features/users/components/ProfilePlan";
import { ProfileSession } from "@/features/users/components/ProfileSession";
import { XtraktoAccount } from "@/features/users/components/XtraktoAccount";
import { YourAccounts } from "@/features/users/components/YourAccounts";
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
  const [account, yours, usage] = await Promise.all([
    getProfileAccount(clerkUserId),
    getYourAccounts(clerkUserId),
    getMonthlyUsage(clerkUserId),
  ]);
  return (
    <>
      <PageHeader title={PROFILE_COPY.title} subtitle={PROFILE_COPY.subtitle} />
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col gap-5.5">
          <XtraktoAccount account={account} />
          <BankName {...yours} />
          <YourAccounts {...yours} />
          <PrivacyAndData />
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5.5">
          <ProfilePlan {...usage} />
          <AnalyticsSetting />
          <ProfileSession lastSignIn={account.lastSignIn} />
        </div>
      </div>
    </>
  );
}
