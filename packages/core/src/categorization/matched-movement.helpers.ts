import { CATEGORY_SOURCE } from "../categories/category-source.constants";
import type { CategoryId, CategorySource } from "../categories/category.types";
import type { AmountMinor } from "../money/money.types";
import type { ReferenceKind } from "../statements/statement.types";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { categorizeByRules } from "./categorization.helpers";
import type { CategorizationRuleId } from "./categorization.types";
import { savedMovementCategory } from "./categorize-statement.helpers";
import {
  type CompiledUserRules,
  userCategoryOf,
  type UserRuleMovement,
} from "./user-rule.helpers";

/**
 * A saved movement as matching it with its other format reads it (10.1a):
 * its text, its amount, its reference and its category.
 */
export type MatchedMovement = {
  readonly descriptionNormalized: string;
  readonly amountMinor: AmountMinor;
  readonly referenceHash: string | null;
  readonly referenceLast4: string | null;
  readonly referenceKind: ReferenceKind | null;
  readonly categoryId: CategoryId | null;
  readonly categorySource: CategorySource | null;
  readonly categoryRuleId: CategorizationRuleId | null;
  readonly llmCategoryId: CategoryId | null;
  readonly isPendingReview: boolean;
};

/** A movement that counts as matching leaves it: its reference and its category. */
export type MatchedUpdate = Pick<
  MatchedMovement,
  | "referenceHash"
  | "referenceLast4"
  | "referenceKind"
  | "categoryId"
  | "categorySource"
  | "categoryRuleId"
  | "isPendingReview"
>;

/** What the rules know of the account: its holder's name and the user's rules. */
export type MatchContext = {
  readonly holderName?: string;
  readonly userRules: CompiledUserRules;
};

type Category = Pick<
  MatchedMovement,
  "categoryId" | "categorySource" | "categoryRuleId" | "isPendingReview"
>;

const UPDATE_FIELDS = [
  "referenceHash",
  "referenceLast4",
  "referenceKind",
  "categoryId",
  "categorySource",
  "categoryRuleId",
  "isPendingReview",
] as const satisfies readonly (keyof MatchedUpdate)[];

const GUESS_RULES: ReadonlySet<string> = new Set(
  CATEGORIZATION_RULES.flatMap((rule) =>
    "isGuess" in rule && rule.isGuess ? [rule.id] : [],
  ),
);

// What the rules read of a movement: its text, its amount and its reference.
const ruleMovementOf = ({
  descriptionNormalized,
  amountMinor,
  referenceHash,
  referenceKind,
}: MatchedMovement): UserRuleMovement => ({
  descriptionNormalized,
  amountMinor,
  ...(referenceKind === null ? {} : { referenceKind }),
  ...(referenceHash === null ? {} : { referenceHash }),
});

// The user chose this movement's category, and no rule of theirs gives it.
const isOwnChoice = (movement: MatchedMovement, rules: CompiledUserRules) =>
  movement.categorySource === CATEGORY_SOURCE.USER &&
  userCategoryOf(ruleMovementOf(movement), rules) === undefined;

// "No sé": a rule's guess the user took out of the review, keeping it.
const isDismissed = ({
  categorySource,
  categoryRuleId,
  isPendingReview,
}: MatchedMovement): boolean =>
  categorySource === CATEGORY_SOURCE.RULE &&
  !isPendingReview &&
  categoryRuleId !== null &&
  GUESS_RULES.has(categoryRuleId);

const categoryOf = (movement: MatchedMovement): Category => ({
  categoryId: movement.categoryId,
  categorySource: movement.categorySource,
  categoryRuleId: movement.categoryRuleId,
  isPendingReview: movement.isPendingReview,
});

// The category a reference decides, from the movement before it and with
// it: the user's rule first, then the table's, which may ask for one. A
// category the user chose for that movement alone stays, and so does a guess
// they answered "No sé" when the reference changes no rule.
const categoryWithReference = (
  before: MatchedMovement,
  after: MatchedMovement,
  { holderName, userRules }: MatchContext,
): Category => {
  const ruled = ruleMovementOf(after);
  const found = categorizeByRules(
    ruled,
    holderName === undefined ? {} : { holderName },
  );
  const categoryRuleId = found?.ruleId ?? null;
  if (isOwnChoice(before, userRules))
    return { ...categoryOf(before), categoryRuleId };
  const usersCategory = userCategoryOf(ruled, userRules);
  if (usersCategory !== undefined)
    return {
      categoryId: usersCategory,
      categorySource: CATEGORY_SOURCE.USER,
      categoryRuleId,
      isPendingReview: false,
    };
  if (categoryRuleId === before.categoryRuleId) return categoryOf(before);
  const saved = savedMovementCategory(
    { ...ruled, categoryRuleId, llmCategoryId: after.llmCategoryId },
    userRules,
  );
  return saved === undefined
    ? categoryOf(before)
    : { ...saved, categoryRuleId };
};

// The hidden movement's reference, which only a movements export carries,
// when the one that counts has none, with what it decides.
const withHiddenReference = (
  counted: MatchedMovement,
  hidden: MatchedMovement,
  context: MatchContext,
): MatchedMovement => {
  if (counted.referenceHash !== null || hidden.referenceHash === null)
    return counted;
  const referenced = {
    ...counted,
    referenceHash: hidden.referenceHash,
    referenceLast4: hidden.referenceLast4,
    referenceKind: hidden.referenceKind,
  };
  return {
    ...referenced,
    ...categoryWithReference(counted, referenced, context),
  };
};

// What the user answered for the hidden movement alone, while it counted
// before its quarterly statement arrived: a category of theirs, or "No sé"
// on the guess the one that counts makes too.
const withHiddenAnswer = (
  counted: MatchedMovement,
  hidden: MatchedMovement,
  userRules: CompiledUserRules,
): MatchedMovement => {
  if (
    isOwnChoice(hidden, userRules) &&
    counted.categorySource !== CATEGORY_SOURCE.USER
  )
    return {
      ...counted,
      categoryId: hidden.categoryId,
      categorySource: CATEGORY_SOURCE.USER,
      isPendingReview: false,
    };
  return isDismissed(hidden) &&
    counted.isPendingReview &&
    counted.categoryRuleId === hidden.categoryRuleId
    ? { ...counted, isPendingReview: false }
    : counted;
};

const updateOf = (movement: MatchedMovement): MatchedUpdate => ({
  referenceHash: movement.referenceHash,
  referenceLast4: movement.referenceLast4,
  referenceKind: movement.referenceKind,
  ...categoryOf(movement),
});

/**
 * What the movement that counts takes from the hidden one of another format
 * it repeats (10.1a): the reference the movements export gave it, when it has
 * none, with the category that reference decides; then the answers the user
 * gave the hidden one alone. `undefined` when nothing changes.
 */
export const matchedUpdate = (
  counted: MatchedMovement,
  hidden: MatchedMovement,
  context: MatchContext,
): MatchedUpdate | undefined => {
  const before = updateOf(counted);
  const after = updateOf(
    withHiddenAnswer(
      withHiddenReference(counted, hidden, context),
      hidden,
      context.userRules,
    ),
  );
  return UPDATE_FIELDS.some((field) => before[field] !== after[field])
    ? after
    : undefined;
};
