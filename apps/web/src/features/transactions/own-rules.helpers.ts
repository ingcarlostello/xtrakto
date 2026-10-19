import {
  categoryKind,
  descriptionRuleFor,
  REFERENCE_KIND,
  type UserCategoryRule,
} from "@xtrakto/core";
import type { MovementDetail } from "@xtrakto/db";
import { CATEGORY_LABELS } from "./transaction-list.helpers";
import {
  DEFAULT_CATEGORY_OF_KIND,
  RULE_CHANGE,
  TRANSACTIONS_COPY,
} from "./transaction.constants";
import type {
  MovementRules,
  OpenMovement,
  OwnRulesView,
  RuleChange,
} from "./transaction.types";

const COPY = TRANSACTIONS_COPY.detail;

type ReferenceRule = Extract<UserCategoryRule, { target: "reference" }>;
type DescriptionRule = Extract<UserCategoryRule, { target: "description" }>;

/** The user's rules that hold for a movement: its number's, and its text's. */
export const rulesOfMovement = (
  movement: MovementDetail,
  rules: readonly UserCategoryRule[],
): MovementRules => {
  // Which movements a text's rule holds for doesn't depend on its category.
  const key = descriptionRuleFor(movement, DEFAULT_CATEGORY_OF_KIND.spending);
  const text =
    key?.target === "description"
      ? rules.find(
          (rule): rule is DescriptionRule =>
            rule.target === "description" &&
            rule.direction === key.direction &&
            rule.descriptionFolded === key.descriptionFolded,
        )
      : undefined;
  const number = rules.find(
    (rule): rule is ReferenceRule =>
      rule.target === "reference" &&
      rule.referenceHash === movement.referenceHash,
  );
  return { number: number ?? null, text: text ?? null };
};

/**
 * The rule that makes a movement's Nequi number the user's: what goes to it
 * and comes from it only moves (ADR 0026). `null` without a number.
 */
export const myNumberRule = ({
  referenceKind,
  referenceHash,
  referenceLast4,
}: MovementDetail): ReferenceRule | null =>
  referenceKind !== REFERENCE_KIND.PHONE || referenceHash === null
    ? null
    : {
        target: "reference",
        referenceHash,
        ...(referenceLast4 === null ? {} : { referenceLast4 }),
        categoryId: "own_account_transfer",
      };

/**
 * A movement's Nequi number, with whether the user said it's theirs, and
 * the user's rule for its text, as the detail shows them to undo (6.3h).
 */
export const ownRulesView = (
  { movement, rules }: OpenMovement,
  accountId: string,
): OwnRulesView => {
  const { referenceLast4 } = movement;
  const hasNumber = myNumberRule(movement) !== null && referenceLast4 !== null;
  const { number, text } = rules;
  return {
    accountId,
    movementId: movement.id,
    number: hasNumber
      ? {
          label: `${COPY.nequi} ${COPY.referenceDots} ${referenceLast4}`,
          state:
            number === null
              ? "unknown"
              : categoryKind(number.categoryId) === "internal"
                ? "mine"
                : "theirs",
        }
      : null,
    textRule:
      text === null
        ? null
        : `«${CATEGORY_LABELS.get(text.categoryId) ?? text.categoryId}»`,
  };
};

const SAID = {
  [RULE_CHANGE.MINE]: COPY.savedMine,
  [RULE_CHANGE.UNDO_NUMBER]: COPY.undoneNumber,
  [RULE_CHANGE.UNDO_TEXT]: COPY.undoneText,
} as const satisfies Record<RuleChange, string>;

/** What a saved change says: "Listo: ese Nequi es tuyo." */
export const ruleChangedText = (change: RuleChange): string => SAID[change];
