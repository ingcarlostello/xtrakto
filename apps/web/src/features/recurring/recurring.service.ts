import "server-only";
import { findUserId, listSummaryMovements, withUserContext } from "@xtrakto/db";
import type { PagePeriodRequest } from "@/components/period-controls/period-controls.types";
import { locatePagePeriod } from "@/components/period-controls/period-location.service";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import {
  calendarMonthOf,
  historyRead,
  periodPayments,
  splitByMonth,
} from "./recurring.helpers";
import type { AccountRecurring } from "./recurring.types";

/**
 * The signed-in user's payments that repeat, in the account and period the
 * URL asks, or the latest: those `findRecurringPayments` finds in the year
 * that ends with the period's last month with movements, split by that
 * month into those it expects and the fixed ones that stopped. `null` until
 * a movement counts; reading never creates the user's row. The Clerk id
 * must come from the session.
 */
export const getRecurringPayments = async (
  clerkUserId: string,
  request: PagePeriodRequest,
): Promise<AccountRecurring | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locatePagePeriod(ctx, request);
    if (!located) return null;
    const days = periodDays(located.period);
    const history = await listSummaryMovements(ctx, {
      accountId: located.account.id,
      period: historyRead(located.period, days),
    });
    const found = periodPayments(history, days);
    if (found === undefined)
      return {
        ...located,
        month: undefined,
        payments: { spending: [], moved: [] },
        stopped: [],
      };
    return {
      ...located,
      month: calendarMonthOf(found.last),
      ...splitByMonth(found.payments, found.last),
    };
  });
};
