import "server-only";
import { findRecurringPayments, monthPeriod, type Period } from "@xtrakto/core";
import {
  findUserId,
  listMovementAccounts,
  listMovementQuarters,
  listSummaryMovements,
  listUnreconciledStatements,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import {
  quarterChoices,
  selectPeriod,
} from "@/components/period-controls/period-choices.helpers";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import {
  calendarMonthOf,
  monthBefore,
  splitByMonth,
} from "./recurring.helpers";
import type { AccountRecurring, RecurringRequest } from "./recurring.types";

// Payments are looked for in the year that ends with the period.
const HISTORY_MONTHS = 12;

const historyOf = ({ to }: Period): Period => ({
  from: monthPeriod(monthBefore(calendarMonthOf(to), HISTORY_MONTHS - 1)).from,
  to,
});

// The account and the period to show: those the URL asks when they're the
// user's and have movements, else the latest.
const locate = async (
  ctx: UserContext,
  request: RecurringRequest,
): Promise<PeriodChoices | undefined> => {
  const accounts = await listMovementAccounts(ctx);
  const account =
    accounts.find(({ id }) => id === request.accountId) ?? accounts[0];
  if (!account) return undefined;
  const unreconciled = (await listUnreconciledStatements(ctx)).filter(
    ({ accountId }) => accountId === account.id,
  );
  const counted = await listMovementQuarters(ctx, account.id);
  const quarters = quarterChoices(counted, unreconciled);
  const period = selectPeriod(request.period, quarters);
  return period && { accounts, account, quarters, period };
};

/**
 * The signed-in user's payments that repeat, in the account and period the
 * URL asks, or the latest: those `findRecurringPayments` finds in the year
 * that ends with the period, split by the period's last month with
 * movements into those it expects and the fixed ones that stopped. `null`
 * until a movement counts; reading never creates the user's row. The Clerk
 * id must come from the session.
 */
export const getRecurringPayments = async (
  clerkUserId: string,
  request: RecurringRequest,
): Promise<AccountRecurring | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locate(ctx, request);
    if (!located) return null;
    const days = periodDays(located.period);
    const movements = await listSummaryMovements(ctx, {
      accountId: located.account.id,
      period: historyOf(days),
    });
    const last = movements.findLast(({ date }) => date >= days.from);
    if (last === undefined)
      return {
        ...located,
        month: undefined,
        payments: { spending: [], moved: [] },
        stopped: [],
      };
    return {
      ...located,
      month: calendarMonthOf(last.date),
      ...splitByMonth(findRecurringPayments(movements), last.date),
    };
  });
};
