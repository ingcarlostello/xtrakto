import "server-only";
import { summarizeMovements } from "@xtrakto/core";
import {
  findUserId,
  listBankFigures,
  listSummaryMovements,
  withUserContext,
} from "@xtrakto/db";
import type { PeriodRequest } from "@/components/period-controls/period-controls.types";
import { locateAccountPeriod } from "@/components/period-controls/period-location.service";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import type { AccountSummary } from "./summary.types";

/**
 * The signed-in user's summary, in the account and period the URL asks, or
 * the latest: what its movements that count add up to
 * (`summarizeMovements`), and the bank's own figures from its quarterly
 * statements there. `null` until a movement counts; reading never creates
 * the user's row. The Clerk id must come from the session.
 */
export const getSummary = async (
  clerkUserId: string,
  request: PeriodRequest,
): Promise<AccountSummary | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locateAccountPeriod(ctx, request);
    if (!located) return null;
    const scope = {
      accountId: located.account.id,
      period: periodDays(located.period),
    };
    return {
      ...located,
      summary: summarizeMovements(await listSummaryMovements(ctx, scope)),
      bankFigures: await listBankFigures(ctx, scope),
    };
  });
};
