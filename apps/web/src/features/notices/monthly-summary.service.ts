import "server-only";
import { DEFAULT_TIME_ZONE, localDateFromInstant } from "@xtrakto/core";
import {
  findClerkUserId,
  listAccountCoverage,
  listAccounts,
  listMonthlySummaryUserIds,
  readNoticePreferences,
  toUserId,
  withUserContext,
} from "@xtrakto/db";
import {
  monthKey,
  monthOfKey,
} from "@/components/coverage-timeline/coverage-timeline.helpers";
import { UNSUBSCRIBE_ROUTES } from "@/lib/auth-routes";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getServerEnv } from "@/lib/env";
import { EXAMPLE_CLERK_USER_ID } from "@/lib/example-mode";
import { inngest, monthlySummaryDue } from "@/lib/inngest";
import { isOtherBank } from "@/utils/account-label.helpers";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { monthlySummaryEmail } from "./monthly-summary-email.helpers";
import { monthlyStatusOf, monthThatEnded } from "./monthly-summary.helpers";
import {
  addressOf,
  type NoticeOutcome,
  outcomeOf,
  urlOf,
} from "./notices.service";
import { unsubscribeToken } from "./unsubscribe-token.helpers";

const notSent = (code: string): NoticeOutcome => ({
  status: "not-sent",
  code,
});

/**
 * Queues the monthly email of everyone who asked for it, about the month
 * that ended in Bogotá: an event of its own for each. Its id makes a retry
 * of this step queue nothing twice. A count only.
 */
export const queueMonthlySummaryEmails = (): Promise<{
  readonly people: number;
}> =>
  withSanitizedErrors("MONTHLY_SUMMARIES_NOT_QUEUED", async () => {
    const userIds = await listMonthlySummaryUserIds(getDb());
    if (userIds.length === 0) return { people: 0 };
    const month = monthKey(
      monthThatEnded(localDateFromInstant(new Date(), DEFAULT_TIME_ZONE)),
    );
    await inngest.send(
      userIds.map((userId) =>
        monthlySummaryDue.create(
          { userId, month },
          { id: `monthly-summary-${month}-${userId}` },
        ),
      ),
    );
    return { people: userIds.length };
  });

/**
 * Emails a person the month that ended: its summary when an account has it
 * through its last day, else which file it needs. Read when it's sent, so a
 * notice turned off meanwhile sends nothing, and never to the example's
 * user. A failure that may pass is thrown for Inngest to retry; Resend's
 * idempotency key keeps a retry from sending it twice.
 */
export const sendMonthlySummary = (
  userId: string,
  monthParam: string,
): Promise<NoticeOutcome> =>
  withSanitizedErrors("MONTHLY_SUMMARY_NOT_SENT", async () => {
    const { isOn, clerkUserId, accounts, hasOtherBank } = await withUserContext(
      getDb(),
      toUserId(userId),
      async (ctx) => ({
        isOn: (await readNoticePreferences(ctx)).monthlySummary,
        clerkUserId: await findClerkUserId(ctx),
        accounts: await listAccountCoverage(ctx),
        hasOtherBank: (await listAccounts(ctx)).some(({ bankId }) =>
          isOtherBank(bankId),
        ),
      }),
    );
    if (!isOn) return notSent("NOTICE_OFF");
    if (clerkUserId === EXAMPLE_CLERK_USER_ID) return notSent("EXAMPLE");
    const address = clerkUserId && (await addressOf(clerkUserId));
    if (!address) return notSent("NO_ADDRESS");
    const token = unsubscribeToken(
      { userId, notices: ["monthlySummary"] },
      getServerEnv().IDENTIFIER_HASH_KEY,
    );
    const month = monthOfKey(monthParam);
    const sent = await sendEmail({
      to: address,
      ...monthlySummaryEmail(
        { status: monthlyStatusOf(accounts, month), hasOtherBank },
        month,
        urlOf(UNSUBSCRIBE_ROUTES.confirm, token),
      ),
      oneClickUrl: urlOf(UNSUBSCRIBE_ROUTES.oneClick, token),
      idempotencyKey: `monthly-summary/${userId}/${monthParam}`,
    });
    return sent.ok ? { status: "sent" } : outcomeOf(sent.error);
  });
