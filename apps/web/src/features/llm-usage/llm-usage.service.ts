import "server-only";
import { captureMessage } from "@sentry/nextjs";
import {
  DEFAULT_TIME_ZONE,
  localDateFromInstant,
  monthBoundsInTimeZone,
} from "@xtrakto/core";
import {
  findUserId,
  platformLlmCostThisMonth,
  recordLlmUsage,
  type UserId,
  userLlmCostIn,
  withUserContext,
} from "@xtrakto/db";
import type { AiLedger } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { USER_MONTHLY_LIMIT_MICRO_USD } from "./llm-usage.constants";
import { crossesAlert, limitReached, usageRowsOf } from "./llm-usage.helpers";

// The calendar month in Bogotá the limits count, as the statements' does.
const thisMonth = () => monthBoundsInTimeZone(new Date(), DEFAULT_TIME_ZONE);

// A message of its own each month, so Sentry opens a new issue and tells the
// owner again; it names the month only.
const alertOwner = () => {
  const month = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE).slice(0, 7);
  captureMessage(
    `LLM spend passed 80% of the platform's budget in ${month}`,
    "warning",
  );
};

/**
 * A user's ledger for LLM calls (8.3): a call goes out only while their
 * month stays under USD 1 and the platform's under its budget, and what each
 * attempt used is saved as theirs. A call that takes the platform past 80% of
 * its budget alerts the owner through Sentry.
 */
export const userLedger = (userId: UserId): AiLedger => ({
  check: () =>
    withUserContext(getDb(), userId, async (ctx) =>
      limitReached({
        user: await userLlmCostIn(ctx, thisMonth()),
        platform: await platformLlmCostThisMonth(ctx),
      }),
    ),
  record: async (call) => {
    const rows = usageRowsOf(call);
    const platform = await withUserContext(getDb(), userId, async (ctx) => {
      await recordLlmUsage(ctx, rows);
      return platformLlmCostThisMonth(ctx);
    });
    const cost = rows.reduce((total, row) => total + row.costMicroUsd, 0);
    if (crossesAlert(platform, cost)) alertOwner();
  },
});

/**
 * Whether the signed-in user's LLM calls used up their month, for "Tu plan".
 * Someone who never sent a file has used nothing.
 */
export const hasUsedUpAiMonth = async (
  clerkUserId: string,
): Promise<boolean> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (userId === undefined) return false;
  const spent = await withUserContext(db, userId, (ctx) =>
    userLlmCostIn(ctx, thisMonth()),
  );
  return spent >= USER_MONTHLY_LIMIT_MICRO_USD;
};
