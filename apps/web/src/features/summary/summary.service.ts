import "server-only";
import {
  dailyBalances,
  findRecurringPayments,
  summarizeMovements,
} from "@xtrakto/core";
import {
  findUserId,
  listBankFigures,
  listSummaryMovements,
  listUnreconciledStatements,
  withUserContext,
} from "@xtrakto/db";
import type { PeriodRequest } from "@/components/period-controls/period-controls.types";
import { locateAccountPeriod } from "@/components/period-controls/period-location.service";
import { historyOf } from "@/features/recurring/recurring.helpers";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import type { AccountSummary } from "./summary.types";

/**
 * The signed-in user's summary, in the account and period the URL asks, or
 * the latest: its movements that count and what they add up to
 * (`summarizeMovements`), the fixed payments found in the year it ends, the
 * balance after the last movement that printed one and day by day, the
 * bank's own figures from its quarterly statements there, and those of its
 * statements that don't reconcile. `null` until a movement counts; reading
 * never creates the user's row. The Clerk id must come from the session.
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
    // The year that ends with the period finds its fixed payments.
    const history = await listSummaryMovements(ctx, {
      ...scope,
      period: historyOf(scope.period),
    });
    const movements = history.filter(({ date }) => date >= scope.period.from);
    const last = movements.findLast((m) => m.balanceAfterMinor !== null);
    return {
      ...located,
      movements,
      summary: summarizeMovements(movements),
      fixedPayments: findRecurringPayments(history).spending,
      balance:
        last && last.balanceAfterMinor !== null
          ? { date: last.date, amountMinor: last.balanceAfterMinor }
          : null,
      balances: dailyBalances(movements),
      bankFigures: await listBankFigures(ctx, scope),
      unreconciled: await listUnreconciledStatements(ctx, scope),
    };
  });
};
