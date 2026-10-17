import type { CategoryId } from "../categories/category.types";
import { foldText } from "../text/text.utils";
import { NO_DESCRIPTION } from "./categorization.constants";
import { moneyDirectionOf } from "./categorization.helpers";
import type {
  CategorizableTransaction,
  MoneyDirection,
  UserCategoryRule,
} from "./categorization.types";

/** The user's rules, ready to look up: by reference, and by text and direction. */
export type CompiledUserRules = {
  readonly byReference: ReadonlyMap<string, CategoryId>;
  readonly byDescription: ReadonlyMap<string, CategoryId>;
};

/** A movement the user's rules read: its text, its amount and its reference. */
export type UserRuleMovement = CategorizableTransaction & {
  readonly referenceHash?: string | undefined;
};

/**
 * The text a rule compares: the bank's text folded, so "TRANSF A Ana Lucia
 * Mar" and "TRANSF A ANA LUCIA MAR" are the same.
 */
export const userRuleTextOf = (descriptionNormalized: string): string =>
  foldText(descriptionNormalized);

const descriptionKey = (direction: MoneyDirection, text: string): string =>
  `${direction} ${text}`;

export const compileUserRules = (
  rules: readonly UserCategoryRule[],
): CompiledUserRules => ({
  byReference: new Map(
    rules.flatMap((rule) =>
      rule.target === "reference"
        ? [[rule.referenceHash, rule.categoryId] as const]
        : [],
    ),
  ),
  byDescription: new Map(
    rules.flatMap((rule) =>
      rule.target === "description"
        ? [
            [
              descriptionKey(rule.direction, rule.descriptionFolded),
              rule.categoryId,
            ] as const,
          ]
        : [],
    ),
  ),
});

/**
 * The category the user's rules give a movement: its reference's rule
 * first, since a reference names one account, then its text's.
 */
export const userCategoryOf = (
  { descriptionNormalized, amountMinor, referenceHash }: UserRuleMovement,
  { byReference, byDescription }: CompiledUserRules,
): CategoryId | undefined => {
  const direction = moneyDirectionOf(amountMinor);
  if (direction === undefined) return undefined;
  const ofReference =
    referenceHash === undefined ? undefined : byReference.get(referenceHash);
  return (
    ofReference ??
    byDescription.get(
      descriptionKey(direction, userRuleTextOf(descriptionNormalized)),
    )
  );
};

/**
 * The rule that gives the category to every movement like this one: the
 * same text, going the same way. `null` for the bank's `0`, which says
 * nothing of what a movement was, and for a movement of 0.
 */
export const descriptionRuleFor = (
  { descriptionNormalized, amountMinor }: CategorizableTransaction,
  categoryId: CategoryId,
): UserCategoryRule | null => {
  const direction = moneyDirectionOf(amountMinor);
  const descriptionFolded = userRuleTextOf(descriptionNormalized);
  if (direction === undefined || descriptionFolded === NO_DESCRIPTION)
    return null;
  return { target: "description", descriptionFolded, direction, categoryId };
};
