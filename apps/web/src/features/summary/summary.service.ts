import "server-only";
import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Period,
  type Result,
  summarizeMovements,
} from "@xtrakto/core";
import {
  findUserId,
  listAccounts,
  listBankFigures,
  listSummaryMovements,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import type { AccountSummary } from "./summary.types";

/**
 * The summary of one of the signed-in user's accounts for a period: what
 * its movements that count add up to (`summarizeMovements`), and the bank's
 * own figures from its quarterly statements there. Not found when the
 * account isn't theirs.
 */
export const getAccountSummary = async (
  clerkUserId: string,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<Result<AccountSummary, AppError>> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return err({ code: APP_ERROR_CODE.NOT_FOUND });
  return withUserContext(db, userId, async (ctx) => {
    const accounts = await listAccounts(ctx);
    if (!accounts.some(({ id }) => id === accountId))
      return err({ code: APP_ERROR_CODE.NOT_FOUND });
    const scope = { accountId, period };
    return ok({
      summary: summarizeMovements(await listSummaryMovements(ctx, scope)),
      bankFigures: await listBankFigures(ctx, scope),
    });
  });
};
