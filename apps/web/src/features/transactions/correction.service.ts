import "server-only";
import {
  APP_ERROR_CODE,
  type AppError,
  descriptionRuleFor,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import {
  findMovementDetail,
  findUserId,
  type MovementDetail,
  saveUserCategoryRule,
  setUserCategory,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { fitsMovement } from "./correction.helpers";
import { CORRECTION_SCOPE } from "./transaction.constants";
import type { CorrectionInput, CorrectionResult } from "./transaction.types";

type Corrected = Promise<Result<CorrectionResult, AppError>>;

// The rule for its text first, when asked, then the movement's own
// category, which it takes even when a number's rule holds the others.
const applyCorrection = async (
  ctx: UserContext,
  movement: MovementDetail,
  { category, scope }: Pick<CorrectionInput, "category" | "scope">,
): Corrected => {
  if (!fitsMovement(movement.amountMinor, category))
    return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  if (scope === CORRECTION_SCOPE.SIMILAR) {
    const rule = descriptionRuleFor(movement, category);
    if (rule === null) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
    await saveUserCategoryRule(ctx, rule);
  }
  await setUserCategory(ctx, {
    movementIds: [movement.id],
    categoryId: category,
  });
  return ok({ scope, category });
};

/**
 * Gives one of the signed-in user's movements the category they chose, and
 * with "Aplicar a los parecidos" a rule for its text and direction too, in
 * every statement and the next ones (6.3a). Not found when the movement
 * isn't one of their account's that count; invalid when the category
 * doesn't fit its money's direction, or its text makes no rule.
 */
export const correctMovementCategory = async (
  clerkUserId: string,
  { account, movement, ...correction }: CorrectionInput,
): Corrected => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return err({ code: APP_ERROR_CODE.NOT_FOUND });
  return withUserContext(db, userId, async (ctx) => {
    const detail = await findMovementDetail(ctx, {
      accountId: account,
      movementId: movement,
    });
    if (!detail) return err({ code: APP_ERROR_CODE.NOT_FOUND });
    return applyCorrection(ctx, detail, correction);
  });
};
