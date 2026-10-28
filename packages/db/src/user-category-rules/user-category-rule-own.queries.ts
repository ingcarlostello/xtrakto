import { CATEGORIES, type UserCategoryRule } from "@xtrakto/core";
import { and, eq, inArray } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { toUserCategoryRule } from "./user-category-rule.queries";
import { userCategoryRules } from "./user-category-rule.schemas";

/** One of the user's rules, with the id that names it to undo it. */
export type IdentifiedUserCategoryRule = {
  readonly id: string;
  readonly rule: UserCategoryRule;
};

const RULE_COLUMNS = {
  descriptionFolded: userCategoryRules.descriptionFolded,
  direction: userCategoryRules.direction,
  referenceHash: userCategoryRules.referenceHash,
  referenceLast4: userCategoryRules.referenceLast4,
  categoryId: userCategoryRules.categoryId,
};

// The categories of money that only moves: what makes something the user's.
const MOVED_CATEGORIES = CATEGORIES.flatMap(({ id, kind }) =>
  kind === "internal" ? [id] : [],
);

/**
 * The user's rules that make something theirs (7.7c): a Nequi number, a
 * card, an investment or a transfer between their accounts, all of which
 * count as moved.
 */
export const listOwnUserCategoryRules = async ({
  tx,
  userId,
}: UserContext): Promise<IdentifiedUserCategoryRule[]> => {
  const rows = await tx
    .select({ id: userCategoryRules.id, ...RULE_COLUMNS })
    .from(userCategoryRules)
    .where(
      and(
        eq(userCategoryRules.userId, userId),
        inArray(userCategoryRules.categoryId, MOVED_CATEGORIES),
      ),
    );
  return rows.map(({ id, ...row }) => ({ id, rule: toUserCategoryRule(row) }));
};

/** One of the user's rules by its id; `undefined` for another user's, or none. */
export const findUserCategoryRule = async (
  { tx, userId }: UserContext,
  id: string,
): Promise<UserCategoryRule | undefined> => {
  const [row] = await tx
    .select(RULE_COLUMNS)
    .from(userCategoryRules)
    .where(
      and(eq(userCategoryRules.id, id), eq(userCategoryRules.userId, userId)),
    );
  return row === undefined ? undefined : toUserCategoryRule(row);
};
