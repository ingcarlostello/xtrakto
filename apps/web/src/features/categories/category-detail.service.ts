import "server-only";
import { type CategoryId, summarizeMovements } from "@xtrakto/core";
import {
  findUserId,
  listSummaryMovements,
  listTransactions,
  listUserCategoryRules,
  withUserContext,
} from "@xtrakto/db";
import type { PeriodRequest } from "@/components/period-controls/period-controls.types";
import { locateAccountPeriod } from "@/components/period-controls/period-location.service";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import { LATEST_MOVEMENTS } from "./categories.constants";
import type { CategoryDetail } from "./categories.types";

/**
 * One of the signed-in user's categories of real spending, in the account
 * and period the URL asks, or the latest: the period's movements that count
 * and what they add up to, the category's newest movements, as Movimientos
 * lists them, and the user's rules that give it. `null` until a movement
 * counts; reading never creates the user's row. The Clerk id must come from
 * the session.
 */
export const getCategoryDetail = async (
  clerkUserId: string,
  categoryId: CategoryId,
  request: PeriodRequest,
): Promise<CategoryDetail | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locateAccountPeriod(ctx, request);
    if (!located) return null;
    const shownPeriod = {
      accountId: located.account.id,
      period: periodDays(located.period),
    };
    const movements = await listSummaryMovements(ctx, shownPeriod);
    const { items } = await listTransactions(ctx, {
      ...shownPeriod,
      categoryIds: [categoryId],
      limit: LATEST_MOVEMENTS,
      offset: 0,
    });
    const rules = await listUserCategoryRules(ctx);
    return {
      ...located,
      categoryId,
      movements,
      summary: summarizeMovements(movements),
      latest: items,
      rules: rules.filter((rule) => rule.categoryId === categoryId),
    };
  });
};
