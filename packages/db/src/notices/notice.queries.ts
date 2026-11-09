import { eq, sql } from "drizzle-orm";
import type { Database, DbTransaction } from "../client/db-client.types";
import type { UserContext } from "../user-context/user-context.types";
import {
  NOTICE_DEFAULTS,
  type NoticeId,
  type NoticePreferences,
} from "./notice.constants";
import { noticePreferences } from "./notice.schemas";

/** Which notices the context user receives. */
export const readNoticePreferences = async ({
  tx,
  userId,
}: UserContext): Promise<NoticePreferences> => {
  const [row] = await tx
    .select({
      uploadReady: noticePreferences.uploadReady,
      reviewWaiting: noticePreferences.reviewWaiting,
      fixedPaymentRose: noticePreferences.fixedPaymentRose,
      monthlySummary: noticePreferences.monthlySummary,
    })
    .from(noticePreferences)
    .where(eq(noticePreferences.userId, userId));
  return row ?? NOTICE_DEFAULTS;
};

/** Turns one of the context user's notices on or off. */
export const saveNoticePreference = async (
  { tx, userId }: UserContext,
  notice: NoticeId,
  isOn: boolean,
): Promise<void> => {
  await tx
    .insert(noticePreferences)
    .values({ userId, [notice]: isOn })
    .onConflictDoUpdate({
      target: noticePreferences.userId,
      set: { [notice]: isOn },
    });
};

/**
 * Who asked for the monthly email, across users (10.5). A query without a
 * user context: it calls a database function that runs with its owner's
 * rights and takes no parameters (ADR 0014). Their ids only.
 */
export const listMonthlySummaryUserIds = async (
  db: Database | DbTransaction,
): Promise<string[]> => {
  const { rows } = await db.execute<{ user_id: string }>(
    sql`select public.users_with_monthly_summary() as user_id`,
  );
  return rows.map(({ user_id }) => user_id);
};
