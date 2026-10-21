import "server-only";
import { summarizeMovements } from "@xtrakto/core";
import {
  findUserId,
  listSummaryMovements,
  listUserCategoryRules,
  withUserContext,
} from "@xtrakto/db";
import type { PeriodRequest } from "@/components/period-controls/period-controls.types";
import { locateAccountPeriod } from "@/components/period-controls/period-location.service";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import type { AccountCategories } from "./categories.types";

/**
 * The signed-in user's categories, in the account and period the URL asks,
 * or the latest: the period's movements that count and what they add up to
 * (`summarizeMovements`), and the user's own rules. `null` until a movement
 * counts; reading never creates the user's row. The Clerk id must come from
 * the session.
 */
export const getCategories = async (
  clerkUserId: string,
  request: PeriodRequest,
): Promise<AccountCategories | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locateAccountPeriod(ctx, request);
    if (!located) return null;
    const movements = await listSummaryMovements(ctx, {
      accountId: located.account.id,
      period: periodDays(located.period),
    });
    return {
      ...located,
      movements,
      summary: summarizeMovements(movements),
      rules: await listUserCategoryRules(ctx),
    };
  });
};
