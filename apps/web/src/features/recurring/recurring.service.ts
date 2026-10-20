import "server-only";
import { findRecurringPayments, monthPeriod, type Period } from "@xtrakto/core";
import { findUserId, listSummaryMovements, withUserContext } from "@xtrakto/db";
import type { PeriodRequest } from "@/components/period-controls/period-controls.types";
import { locateAccountPeriod } from "@/components/period-controls/period-location.service";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import {
  calendarMonthOf,
  monthBefore,
  splitByMonth,
} from "./recurring.helpers";
import type { AccountRecurring } from "./recurring.types";

// Payments are looked for in the year that ends with the period.
const HISTORY_MONTHS = 12;

const historyOf = ({ to }: Period): Period => ({
  from: monthPeriod(monthBefore(calendarMonthOf(to), HISTORY_MONTHS - 1)).from,
  to,
});

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
  request: PeriodRequest,
): Promise<AccountRecurring | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locateAccountPeriod(ctx, request);
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
