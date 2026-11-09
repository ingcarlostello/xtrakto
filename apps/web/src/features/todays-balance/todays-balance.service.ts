import "server-only";
import {
  addDaysTo,
  type AmountMinor,
  APP_ERROR_CODE,
  type AppError,
  checkReportedBalance,
  DEFAULT_TIME_ZONE,
  err,
  type LocalDate,
  localDateFromInstant,
  ok,
  type Period,
  type ReportedBalanceCheck,
  type Result,
} from "@xtrakto/core";
import {
  findLatestVerifiedClosing,
  findReportedBalance,
  findUserId,
  listSummaryMovements,
  saveReportedBalance,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { answerOf, reachesToday } from "./todays-balance.helpers";
import type {
  TodaysBalanceAnswer,
  TodaysBalanceOffer,
} from "./todays-balance.types";

/**
 * What the account's latest balance typed says of it, worked out when read
 * (10.3): the latest verified closing balance plus the movements that count
 * since it. `undefined` without a balance typed, or with nothing to compare
 * it with.
 */
export const readBalanceCheck = async (
  ctx: UserContext,
  accountId: string,
): Promise<ReportedBalanceCheck | undefined> => {
  const reported = await findReportedBalance(ctx, accountId);
  if (!reported) return undefined;
  const closing = await findLatestVerifiedClosing(ctx, accountId);
  if (!closing || closing.date >= reported.date) return undefined;
  const movements = await listSummaryMovements(ctx, {
    accountId,
    period: { from: addDaysTo(closing.date, 1), to: reported.date },
  });
  return checkReportedBalance(reported, closing, movements);
};

/**
 * The field a movements file's result offers: when the file reaches today,
 * no verified quarterly statement covers its last day, and one closed
 * before it. With its answer when a balance was typed today.
 */
export const readTodaysBalanceOffer = async (
  ctx: UserContext,
  { accountId, period }: { accountId: string; period: Period },
  today: LocalDate,
): Promise<TodaysBalanceOffer | undefined> => {
  if (!reachesToday(period.to, today)) return undefined;
  const closing = await findLatestVerifiedClosing(ctx, accountId);
  if (!closing || closing.date >= period.to) return undefined;
  const check = await readBalanceCheck(ctx, accountId);
  return {
    accountId,
    ...(check?.reported.date === today ? { answer: answerOf(check) } : {}),
  };
};

/**
 * Keeps today's balance on the signed-in user's account, in place of the
 * one before, and says whether it adds up. Only the user's own account: any
 * other, like a balance with nothing to compare it with, is not found. The
 * Clerk id must come from the session.
 */
export const keepTodaysBalance = (
  clerkUserId: string,
  accountId: string,
  amountMinor: AmountMinor,
): Promise<Result<TodaysBalanceAnswer, AppError>> =>
  withSanitizedErrors("TODAYS_BALANCE_NOT_SAVED", async () => {
    const db = getDb();
    const userId = await findUserId(db, clerkUserId);
    if (!userId) return err({ code: APP_ERROR_CODE.NOT_FOUND });
    return withUserContext(db, userId, async (ctx) => {
      const date = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE);
      const isSaved = await saveReportedBalance(ctx, accountId, {
        date,
        amountMinor,
      });
      const check = isSaved && (await readBalanceCheck(ctx, accountId));
      return check
        ? ok(answerOf(check))
        : err({ code: APP_ERROR_CODE.NOT_FOUND });
    });
  });
