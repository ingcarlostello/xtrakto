import {
  CATEGORIZATION_RULES,
  type CategorizationRuleId,
  CATEGORY_SOURCE,
  categoryKind,
  channelOf,
  CURRENCY,
  formatAmount,
  formatWeekdayInWords,
  type LocalDate,
  quarterOfMonth,
} from "@xtrakto/core";
import type { MovementDetail } from "@xtrakto/db";
import { statementLabel } from "@/utils/statement-label.helpers";
import { reviewHref } from "@/utils/transactions-url.helpers";
import { movementTone } from "./kind-view.helpers";
import {
  amountText,
  CATEGORY_LABELS,
  descriptionView,
} from "./transaction-list.helpers";
import { TRANSACTIONS_COPY } from "./transaction.constants";
import type { DetailFact, MovementDetailView } from "./transaction.types";

const COPY = TRANSACTIONS_COPY.detail;

const RULE_REASONS: ReadonlyMap<CategorizationRuleId, string> = new Map(
  CATEGORIZATION_RULES.map(({ id, reasonEs }) => [id, reasonEs]),
);

// Its channel, the digits its reference kept, the statement it came from,
// its balance after and its kind: those it has.
const factsOf = (detail: MovementDetail): DetailFact[] => {
  const { descriptionRaw, referenceLast4, statement } = detail;
  const channel = channelOf(descriptionRaw)?.labelEs;
  const kind =
    detail.categoryId === null ? undefined : categoryKind(detail.categoryId);
  const facts: DetailFact[] = [];
  if (channel !== undefined)
    facts.push({ label: COPY.channel, value: channel });
  if (referenceLast4 !== null)
    facts.push({
      label: COPY.reference,
      value: `${COPY.referenceDots} ${referenceLast4}`,
    });
  facts.push({
    label: COPY.source,
    value: statementLabel(statement.formatId, statement.period),
  });
  if (detail.balanceAfterMinor !== null)
    facts.push({
      label: COPY.balanceAfter,
      value: formatAmount(detail.balanceAfterMinor, CURRENCY.COP),
    });
  if (kind !== undefined)
    facts.push({ label: COPY.kind, value: COPY.kinds[kind] });
  return facts;
};

// Why it has its category: the rule's reason, which the system gave without
// AI, or the user's answer; or that no rule knows it.
const reasonOf = ({
  categorySource,
  categoryRuleId,
}: MovementDetail): string => {
  if (categorySource === CATEGORY_SOURCE.USER) return COPY.yours;
  if (categorySource !== CATEGORY_SOURCE.RULE) return COPY.unknown;
  const reason =
    categoryRuleId === null ? undefined : RULE_REASONS.get(categoryRuleId);
  return reason === undefined
    ? COPY.systemRule
    : `${reason}. ${COPY.systemRule}`;
};

// The quick review of the quarter the movement falls in.
const reviewOf = (accountId: string, date: LocalDate) =>
  reviewHref({
    accountId,
    period: {
      kind: "quarter",
      year: Number(date.slice(0, 4)),
      quarter: quarterOfMonth(Number(date.slice(5, 7))),
    },
  });

/** One of an account's movements as its detail shows it (docs/ui/v8-03). */
export const movementDetailView = (
  detail: MovementDetail,
  accountId: string,
): MovementDetailView => {
  const description = descriptionView(detail.descriptionRaw);
  const { categoryId, isPendingReview } = detail;
  return {
    id: detail.id,
    title:
      description.kind === "bank"
        ? description.text
        : TRANSACTIONS_COPY.noDescription,
    bankText: detail.descriptionRaw,
    date: formatWeekdayInWords(detail.date, { withYear: true }),
    amount: amountText(detail.amountMinor),
    tone: movementTone(detail, true),
    categoryId,
    facts: factsOf(detail),
    category:
      categoryId === null
        ? COPY.noCategory
        : (CATEGORY_LABELS.get(categoryId) ?? categoryId),
    isGuess: isPendingReview,
    reason: reasonOf(detail),
    ...(isPendingReview
      ? { reviewHref: reviewOf(accountId, detail.date) }
      : {}),
  };
};
