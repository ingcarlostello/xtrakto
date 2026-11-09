import "server-only";
import {
  DEFAULT_TIME_ZONE,
  dailyBalances,
  localDateFromInstant,
  summarizeMovements,
} from "@xtrakto/core";
import {
  findUserId,
  listAccountCoverage,
  listBankFigures,
  listSummaryMovements,
  listUnreconciledStatements,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import type { PagePeriodRequest } from "@/components/period-controls/period-controls.types";
import { locatePagePeriod } from "@/components/period-controls/period-location.service";
import {
  historyRead,
  periodPayments,
} from "@/features/recurring/recurring.helpers";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import { missingOf } from "./missing-months.helpers";
import type { AccountSummary } from "./summary.types";

// What the account misses through today in Bogotá (10.2d).
const missingToday = async (ctx: UserContext, accountId: string) =>
  missingOf(
    await listAccountCoverage(ctx),
    accountId,
    localDateFromInstant(new Date(), DEFAULT_TIME_ZONE),
  );

/**
 * The signed-in user's summary, in the account and period the URL asks, or
 * the latest: its movements that count and what they add up to
 * (`summarizeMovements`), the fixed payments found in the year that ends
 * with its last month with movements, as on Pagos fijos, the balance after
 * the last movement that printed one and day by day, the bank's own figures
 * from its quarterly statements there, those of its statements that don't
 * reconcile, and the months the account misses. `null` until a movement
 * counts; reading never creates the user's row. The Clerk id must come
 * from the session.
 */
export const getSummary = async (
  clerkUserId: string,
  request: PagePeriodRequest,
): Promise<AccountSummary | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locatePagePeriod(ctx, request);
    if (!located) return null;
    const scope = {
      accountId: located.account.id,
      period: periodDays(located.period),
    };
    const history = await listSummaryMovements(ctx, {
      ...scope,
      period: historyRead(located.period, scope.period),
    });
    const movements = history.filter(({ date }) => date >= scope.period.from);
    const last = movements.findLast((m) => m.balanceAfterMinor !== null);
    return {
      ...located,
      movements,
      summary: summarizeMovements(movements),
      fixedPayments:
        periodPayments(history, scope.period)?.payments.spending ?? [],
      balance:
        last && last.balanceAfterMinor !== null
          ? { date: last.date, amountMinor: last.balanceAfterMinor }
          : null,
      balances: dailyBalances(movements),
      bankFigures: await listBankFigures(ctx, scope),
      unreconciled: await listUnreconciledStatements(ctx, scope),
      ...(await missingToday(ctx, located.account.id)),
    };
  });
};
