import {
  type CalendarQuarter,
  type CategorizationRuleId,
  type CategoryId,
  descriptionRuleFor,
  formatQuarter,
  sumAmounts,
  type UserCategoryRule,
} from "@xtrakto/core";
import type { ReviewMovement } from "@xtrakto/db";
import { accountShortLabel } from "@/utils/account-label.helpers";
import {
  type MovementPeriod,
  quarterOf,
} from "@/utils/transactions-url.helpers";
import { REVIEW_GROUPS } from "./review.constants";
import type {
  AnswerPlan,
  Review,
  ReviewGroup,
  ReviewGroupDefinition,
  ReviewGroupId,
  ReviewText,
} from "./review.types";

const GROUP_OF_RULE: ReadonlyMap<CategorizationRuleId, ReviewGroupId> = new Map(
  REVIEW_GROUPS.flatMap(({ id, ruleIds }) =>
    ruleIds.map((ruleId) => [ruleId, id] as const),
  ),
);

/** A question of the quick review. */
export const reviewGroupById = (id: ReviewGroupId): ReviewGroupDefinition => {
  const group = REVIEW_GROUPS.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`No review group named ${id}.`);
  return group;
};

// Each bank text as printed, with how many movements carry it, the most
// repeated first.
const textsOf = (movements: readonly ReviewMovement[]): ReviewText[] => {
  const counts = new Map<string, number>();
  for (const { descriptionRaw } of movements)
    counts.set(descriptionRaw, (counts.get(descriptionRaw) ?? 0) + 1);
  return [...counts]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "es"));
};

/**
 * The questions to ask about these movements, in the review's order, each
 * with its bank texts, the amount at stake and how many movements it holds.
 */
export const reviewGroupsOf = (
  movements: readonly ReviewMovement[],
): ReviewGroup[] =>
  REVIEW_GROUPS.flatMap(({ id }) => {
    const ofGroup = movements.filter(
      ({ ruleId }) => GROUP_OF_RULE.get(ruleId) === id,
    );
    if (ofGroup.length === 0) return [];
    return [
      {
        id,
        texts: textsOf(ofGroup),
        amountMinor: sumAmounts(ofGroup.map(({ amountMinor }) => amountMinor)),
        count: ofGroup.length,
      },
    ];
  });

/**
 * What answering a group with a category saves: one rule per text and
 * direction, for every statement, and the movements the bank wrote as `0`,
 * which no rule can name, by id.
 */
export const answerPlan = (
  movements: readonly ReviewMovement[],
  categoryId: CategoryId,
): AnswerPlan => {
  const rules = new Map<string, UserCategoryRule>();
  const movementIds: string[] = [];
  for (const movement of movements) {
    const rule = descriptionRuleFor(movement, categoryId);
    if (rule?.target === "description")
      rules.set(`${rule.direction} ${rule.descriptionFolded}`, rule);
    else movementIds.push(movement.id);
  }
  return { rules: [...rules.values()], movementIds };
};

/**
 * The quarter to review: the one the URL asks, or holds the month it asks,
 * when the account has movements in it; else the account's latest.
 */
export const pickQuarter = (
  requested: MovementPeriod | undefined,
  quarters: readonly CalendarQuarter[],
): MovementPeriod | undefined => {
  const asked = requested && quarterOf(requested);
  const chosen =
    quarters.find(
      (candidate) =>
        candidate.year === asked?.year && candidate.quarter === asked.quarter,
    ) ?? quarters[0];
  return (
    chosen && { kind: "quarter", year: chosen.year, quarter: chosen.quarter }
  );
};

/** `"Jul – sep 2026 · Cuenta de ahorros ••••8901"`. */
export const scopeText = ({ account, period }: Review): string =>
  `${formatQuarter(quarterOf(period))} · ${accountShortLabel(account, account.last4)}`;
