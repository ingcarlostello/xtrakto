import "server-only";
import {
  APP_ERROR_CODE,
  type AppError,
  type CategoryId,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import {
  dismissReview,
  findUserId,
  listMovementAccounts,
  listMovementQuarters,
  listReviewMovements,
  type ReviewMovement,
  saveUserCategoryRule,
  setUserCategory,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import { REVIEW_ANSWERS } from "./review.constants";
import {
  answerPlan,
  pickQuarter,
  reviewGroupById,
  reviewGroupsOf,
} from "./review.helpers";
import type { Review, ReviewAnswerInput, ReviewRequest } from "./review.types";

/**
 * The quick review of the signed-in user's account and quarter the URL
 * asks, or of their latest: by group, what waits for review there and what
 * was answered. `null` until a movement counts. The Clerk id must come from
 * the session.
 */
export const getReview = async (
  clerkUserId: string,
  request: ReviewRequest,
): Promise<Review | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const accounts = await listMovementAccounts(ctx);
    const account =
      accounts.find(({ id }) => id === request.accountId) ?? accounts[0];
    if (!account) return null;
    const quarters = await listMovementQuarters(ctx, account.id);
    const period = pickQuarter(request.period, quarters);
    if (!period) return null;
    const movements = await listReviewMovements(ctx, {
      accountId: account.id,
      period: periodDays(period),
    });
    return { account, period, groups: reviewGroupsOf(movements) };
  });
};

// A rule for each text, which holds in every statement, then the category
// of the movements no rule can name. One after the other: they share the
// transaction.
const saveAnswer = async (
  ctx: UserContext,
  movements: readonly ReviewMovement[],
  categoryId: CategoryId,
): Promise<void> => {
  const { rules, movementIds } = answerPlan(movements, categoryId);
  for (const rule of rules) await saveUserCategoryRule(ctx, rule);
  await setUserCategory(ctx, { movementIds, categoryId });
};

/**
 * Answers a group of the quick review for the signed-in user's account and
 * quarter: what waits for review in it, or, once nothing does, what was
 * answered, which "Cambiar" asks about again. "No sé" takes the movements
 * out of the review, and any other answer gives them its category. Not
 * found when the account isn't theirs.
 */
export const answerReviewGroup = async (
  clerkUserId: string,
  { group, answer, account, period }: ReviewAnswerInput,
): Promise<Result<null, AppError>> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return err({ code: APP_ERROR_CODE.NOT_FOUND });
  return withUserContext(db, userId, async (ctx) => {
    const accounts = await listMovementAccounts(ctx);
    if (!accounts.some(({ id }) => id === account))
      return err({ code: APP_ERROR_CODE.NOT_FOUND });
    const ofGroup = await listReviewMovements(ctx, {
      accountId: account,
      period: periodDays(period),
      ruleIds: reviewGroupById(group).ruleIds,
    });
    const pending = ofGroup.filter(({ isPendingReview }) => isPendingReview);
    const movements = pending.length > 0 ? pending : ofGroup;
    const { categoryId } = REVIEW_ANSWERS[answer];
    if (categoryId === null)
      await dismissReview(
        ctx,
        movements.map(({ id }) => id),
      );
    else await saveAnswer(ctx, movements, categoryId);
    return ok(null);
  });
};
