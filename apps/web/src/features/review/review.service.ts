import "server-only";
import {
  APP_ERROR_CODE,
  type AppError,
  type CategoryId,
  err,
  kindTotalsOf,
  ok,
  type Result,
} from "@xtrakto/core";
import {
  dismissReview,
  findUserId,
  listCategoryTotals,
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
  numberRules,
  numbersOf,
  pickQuarter,
  reviewGroupById,
  reviewGroupsOf,
} from "./review.helpers";
import type {
  NumbersAnswerInput,
  Review,
  ReviewAnswerInput,
  ReviewGroupId,
  ReviewRequest,
} from "./review.types";

const NEQUI_NUMBERS: ReviewGroupId = "nequi_numbers";

/**
 * The quick review of the signed-in user's account and quarter the URL
 * asks, or of their latest: by group, what waits for review there and what
 * was answered, and the quarter's totals by kind as they stand. `null`
 * until a movement counts. The Clerk id must come from the session.
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
    const scope = { accountId: account.id, period: periodDays(period) };
    const movements = await listReviewMovements(ctx, scope);
    const totals = kindTotalsOf(await listCategoryTotals(ctx, scope));
    return { account, period, groups: reviewGroupsOf(movements), totals };
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

type AnsweredScope = Pick<ReviewAnswerInput, "group" | "account" | "period">;

/**
 * Answers a group of the signed-in user's account and quarter with `save`:
 * what waits for review in it, or, once nothing does, what was answered,
 * which "Cambiar" asks about again. Not found when the account isn't theirs.
 */
const answerInScope = async (
  clerkUserId: string,
  { group, account, period }: AnsweredScope,
  save: (
    ctx: UserContext,
    movements: readonly ReviewMovement[],
  ) => Promise<void>,
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
    await save(ctx, pending.length > 0 ? pending : ofGroup);
    return ok(null);
  });
};

/**
 * Answers a group of the quick review: "No sé" takes its movements out of
 * the review, and any other answer gives them its category.
 */
export const answerReviewGroup = (
  clerkUserId: string,
  { answer, ...scope }: ReviewAnswerInput,
): Promise<Result<null, AppError>> =>
  answerInScope(clerkUserId, scope, async (ctx, movements) => {
    const { categoryId } = REVIEW_ANSWERS[answer];
    if (categoryId === null)
      await dismissReview(
        ctx,
        movements.map(({ id }) => id),
      );
    else await saveAnswer(ctx, movements, categoryId);
  });

/**
 * Answers the Nequi numbers: each number's rule, the user's own for those
 * marked and someone else's for the rest, in every statement. A number not
 * among the quarter's is ignored.
 */
export const answerReviewNumbers = (
  clerkUserId: string,
  { mine, ...scope }: NumbersAnswerInput,
): Promise<Result<null, AppError>> =>
  answerInScope(
    clerkUserId,
    { ...scope, group: NEQUI_NUMBERS },
    async (ctx, movements) => {
      const rules = numberRules(numbersOf(movements), new Set(mine));
      for (const rule of rules) await saveUserCategoryRule(ctx, rule);
    },
  );
