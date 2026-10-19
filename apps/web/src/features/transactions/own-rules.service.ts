import "server-only";
import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import {
  deleteUserCategoryRule,
  findMovementDetail,
  findUserId,
  listUserCategoryRules,
  type MovementDetail,
  saveUserCategoryRule,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { myNumberRule, rulesOfMovement } from "./own-rules.helpers";
import { RULE_CHANGE } from "./transaction.constants";
import type { RuleChange, RuleChangeInput } from "./transaction.types";

type Changed = Promise<Result<RuleChange, AppError>>;

// Its number made the user's, or its number's or its text's rule undone.
const applyRuleChange = async (
  ctx: UserContext,
  { movement, intent }: { movement: MovementDetail; intent: RuleChange },
): Changed => {
  if (intent === RULE_CHANGE.MINE) {
    const mine = myNumberRule(movement);
    if (mine === null) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
    await saveUserCategoryRule(ctx, mine);
    return ok(intent);
  }
  const rules = rulesOfMovement(movement, await listUserCategoryRules(ctx));
  const rule = intent === RULE_CHANGE.UNDO_NUMBER ? rules.number : rules.text;
  if (rule === null) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  await deleteUserCategoryRule(ctx, rule);
  return ok(intent);
};

/**
 * Makes the Nequi number of one of the signed-in user's movements theirs,
 * or undoes their rule for its number or its text, whose movements then
 * take what their other rules or the table's say (6.3h). Not found when the
 * movement isn't one of their account's that count; invalid when it has no
 * such number or rule.
 */
export const updateMovementRules = async (
  clerkUserId: string,
  { account, movement, intent }: RuleChangeInput,
): Changed => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return err({ code: APP_ERROR_CODE.NOT_FOUND });
  return withUserContext(db, userId, async (ctx) => {
    const detail = await findMovementDetail(ctx, {
      accountId: account,
      movementId: movement,
    });
    if (!detail) return err({ code: APP_ERROR_CODE.NOT_FOUND });
    return applyRuleChange(ctx, { movement: detail, intent });
  });
};
