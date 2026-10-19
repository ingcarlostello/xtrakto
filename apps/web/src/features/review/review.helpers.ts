import {
  type CalendarQuarter,
  CATEGORIES,
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
  periodParam,
  quarterOf,
  TRANSACTIONS_PARAMS,
} from "@/utils/transactions-url.helpers";
import { REVIEW_ANSWERS, REVIEW_GROUPS } from "./review.constants";
import type {
  AnswerPlan,
  GroupMovements,
  Review,
  ReviewAnswerId,
  ReviewGroup,
  ReviewGroupDefinition,
  ReviewGroupId,
  ReviewOutcome,
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

const movementsOf = (movements: readonly ReviewMovement[]): GroupMovements => ({
  texts: textsOf(movements),
  amountMinor: sumAmounts(movements.map(({ amountMinor }) => amountMinor)),
  count: movements.length,
});

const CATEGORY_LABELS: ReadonlyMap<CategoryId, string> = new Map(
  CATEGORIES.map(({ id, labelEs }) => [id, labelEs]),
);

// What an answered movement counts as now: the group's answer that gives its
// category, said back; "No sé" when the guess stands; or the label of a
// category the user gave it elsewhere.
const outcomeOf = (
  { answers }: ReviewGroupDefinition,
  { categoryId, isUsersCategory }: ReviewMovement,
): Omit<ReviewOutcome, "count"> => {
  if (!isUsersCategory)
    return { said: REVIEW_ANSWERS.unsure.said, categoryId, isGuessKept: true };
  const answer = answers.find(
    (id) => REVIEW_ANSWERS[id].categoryId === categoryId,
  );
  return {
    said:
      answer === undefined
        ? (CATEGORY_LABELS.get(categoryId) ?? categoryId)
        : REVIEW_ANSWERS[answer].said,
    categoryId,
    isGuessKept: false,
  };
};

// The answered movements by what they count as now, the most first.
const outcomesOf = (
  definition: ReviewGroupDefinition,
  movements: readonly ReviewMovement[],
): ReviewOutcome[] => {
  const outcomes = new Map<string, ReviewOutcome>();
  for (const movement of movements) {
    const outcome = outcomeOf(definition, movement);
    const key = `${outcome.isGuessKept} ${outcome.categoryId}`;
    outcomes.set(key, {
      ...outcome,
      count: (outcomes.get(key)?.count ?? 0) + 1,
    });
  }
  return [...outcomes.values()].sort((a, b) => b.count - a.count);
};

/**
 * The questions about these movements, in the review's order: what each
 * still asks about, with its bank texts, the amount at stake and how many
 * movements, and what was answered and counts as what now.
 */
export const reviewGroupsOf = (
  movements: readonly ReviewMovement[],
): ReviewGroup[] =>
  REVIEW_GROUPS.flatMap((definition): ReviewGroup[] => {
    const ofGroup = movements.filter(
      ({ ruleId }) => GROUP_OF_RULE.get(ruleId) === definition.id,
    );
    const pending = ofGroup.filter(({ isPendingReview }) => isPendingReview);
    const answered = ofGroup.filter(({ isPendingReview }) => !isPendingReview);
    const withOutcomes =
      answered.length === 0
        ? null
        : {
            ...movementsOf(answered),
            outcomes: outcomesOf(definition, answered),
          };
    if (pending.length > 0)
      return [
        {
          id: definition.id,
          pending: movementsOf(pending),
          answered: withOutcomes,
        },
      ];
    return withOutcomes === null
      ? []
      : [{ id: definition.id, pending: null, answered: withOutcomes }];
  });

/**
 * The answers a group offers. Answered again with "Cambiar", all but "No
 * sé": an answer given can change, not go back to the guess.
 */
export const answersToOffer = (
  id: ReviewGroupId,
  { isChange }: { isChange: boolean },
): ReviewAnswerId[] =>
  reviewGroupById(id).answers.filter(
    (answer) => !isChange || REVIEW_ANSWERS[answer].categoryId !== null,
  );

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
export const scopeText = ({
  account,
  period,
}: Pick<Review, "account" | "period">): string =>
  `${formatQuarter(quarterOf(period))} · ${accountShortLabel(account, account.last4)}`;

/** The review of an account's quarter, with both in the URL. */
export const reviewHref = ({
  account,
  period,
}: Pick<Review, "account" | "period">) => ({
  pathname: "/review" as const,
  query: {
    [TRANSACTIONS_PARAMS.account]: account.id,
    [TRANSACTIONS_PARAMS.period]: periodParam(period),
  },
});
