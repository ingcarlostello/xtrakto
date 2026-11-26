import {
  CATEGORIZATION_RULES,
  type CategorizationRuleId,
  CATEGORY_SOURCE,
  channelOf,
  CURRENCY,
  formatAmount,
  formatWeekdayInWords,
  type LocalDate,
  quarterOfMonth,
} from "@xtrakto/core";
import type { MovementDetail } from "@xtrakto/db";
import { descriptionView } from "@/components/movement-row/movement-row.helpers";
import type { DescriptionView } from "@/components/movement-row/movement-row.types";
import { CARD_INSTALLMENTS_COPY as CARD } from "@/features/cards/card-installments.constants";
import {
  installmentNote,
  leftText,
  statementText,
} from "@/features/cards/card-installments.helpers";
import type { LatestInstallment } from "@/features/cards/card-installments.types";
import { CARD_PAYMENTS_COPY } from "@/features/cards/card-payments.constants";
import { pairedText } from "@/features/cards/card-payments.helpers";
import { joined } from "@/utils/list-text.utils";
import { statementLabel } from "@/utils/statement-label.helpers";
import { reviewHref, transactionsHref } from "@/utils/transactions-url.helpers";
import { movementTone } from "./kind-view.helpers";
import { amountText } from "./transaction-list.helpers";
import { TRANSACTIONS_COPY } from "./transaction.constants";
import type {
  DetailFact,
  MovementDetailView,
  OpenMovement,
} from "./transaction.types";

const COPY = TRANSACTIONS_COPY.detail;

const RULE_REASONS: ReadonlyMap<CategorizationRuleId, string> = new Map(
  CATEGORIZATION_RULES.map(({ id, reasonEs }) => [id, reasonEs]),
);

// The files that saved it: its statement, then the movements file whose
// movement repeats it (10.1c), whose label goes mid-sentence: "Extracto
// trimestral jul–sep 2026 y movimientos 15–31 ago 2026".
const sourceOf = ({ statement, twin }: MovementDetail): string => {
  const own = statementLabel(statement.formatId, statement.period);
  if (twin === null) return own;
  const other = statementLabel(twin.statement.formatId, twin.statement.period);
  return joined([
    own,
    `${other.charAt(0).toLocaleLowerCase("es-CO")}${other.slice(1)}`,
  ]);
};

// How the movements file that repeats it wrote it, when that reads
// otherwise: a quarterly statement can cut a text before an accented letter
// (Appendix A.2). Spaces and how a letter is encoded don't count: a PDF
// prints one space where the Excel prints two.
const alsoWrittenAsOf = ({
  descriptionNormalized,
  twin,
}: MovementDetail): string[] =>
  twin !== null &&
  twin.descriptionNormalized.normalize("NFC") !==
    descriptionNormalized.normalize("NFC")
    ? [twin.descriptionRaw]
    : [];

// Its channel, the digits its reference kept, the files it came from and
// its balance after: those it has. Its kind and category are choices of
// their own (6.3g).
const factsOf = (detail: MovementDetail): DetailFact[] => {
  const { descriptionRaw, referenceLast4 } = detail;
  const channel = channelOf(descriptionRaw)?.labelEs;
  const facts: DetailFact[] = [];
  if (channel !== undefined)
    facts.push({ label: COPY.channel, value: channel });
  if (referenceLast4 !== null)
    facts.push({
      label: COPY.reference,
      value: `${COPY.referenceDots} ${referenceLast4}`,
    });
  facts.push({ label: COPY.source, value: sourceOf(detail) });
  if (detail.balanceAfterMinor !== null)
    facts.push({
      label: COPY.balanceAfter,
      value: formatAmount(detail.balanceAfterMinor, CURRENCY.COP),
    });
  return facts;
};

// A card's purchase in installments (12.3d): which one its latest statement
// charged, and what's left after it.
const installmentFacts = (installment?: LatestInstallment): DetailFact[] => {
  if (!installment) return [];
  const { number, count } = installment;
  return [
    {
      label: CARD.installment,
      value: `${installmentNote(installment)}, ${statementText(installment)}`,
    },
    ...(number < count
      ? [{ label: CARD.leftToPay, value: leftText(installment) }]
      : []),
  ];
};

// The other side of a payment to a card (12.3e), leading to its detail.
const paymentFacts = (payment?: OpenMovement["cardPayment"]): DetailFact[] =>
  payment
    ? [
        {
          label: CARD_PAYMENTS_COPY.label,
          value: pairedText(payment.pair),
          href: transactionsHref({
            accountId: payment.pair.account.id,
            period: payment.period,
            movementId: payment.pair.movementId,
          }),
        },
      ]
    : [];

/** What a card's movement adds to its detail: its installment (12.3d), or a payment's other side (12.3e). */
export type CardDetail = Pick<OpenMovement, "installment" | "cardPayment">;

// Why it has its category: the rule's reason, which the system gave without
// AI, the LLM's answer from the bank's text, or the user's answer; or that
// no rule knows it.
const reasonOf = ({
  categorySource,
  categoryRuleId,
}: MovementDetail): string => {
  if (categorySource === CATEGORY_SOURCE.USER) return COPY.yours;
  if (categorySource === CATEGORY_SOURCE.LLM) return COPY.ai;
  if (categorySource !== CATEGORY_SOURCE.RULE) return COPY.unknown;
  const reason =
    categoryRuleId === null ? undefined : RULE_REASONS.get(categoryRuleId);
  return reason === undefined
    ? COPY.systemRule
    : `${reason}. ${COPY.systemRule}`;
};

// Its title in plain words, the bank's text, or that the bank gave none.
const titleOf = (description: DescriptionView): string => {
  if (description.kind === "bank") return description.text;
  if (description.kind === "titled") return description.title;
  return TRANSACTIONS_COPY.noDescription;
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

/**
 * One of an account's movements as its detail shows it (docs/ui/v8-03), a
 * card's purchase with its installments (12.3d), and a payment to a card
 * with its other side (12.3e).
 */
export const movementDetailView = (
  detail: MovementDetail,
  accountId: string,
  card: CardDetail = {},
): MovementDetailView => {
  const description = descriptionView(detail);
  const { categoryId, isPendingReview } = detail;
  return {
    id: detail.id,
    title: titleOf(description),
    isBankText: description.kind === "bank",
    bankText: detail.descriptionRaw,
    alsoWrittenAs: alsoWrittenAsOf(detail),
    date: formatWeekdayInWords(detail.date, { withYear: true }),
    amount: amountText(detail.amountMinor),
    tone: movementTone(detail, true),
    categoryId,
    facts: [
      ...factsOf(detail),
      ...installmentFacts(card.installment),
      ...paymentFacts(card.cardPayment),
    ],
    isGuess: isPendingReview,
    reason: reasonOf(detail),
    ...(isPendingReview
      ? { reviewHref: reviewOf(accountId, detail.date) }
      : {}),
  };
};
