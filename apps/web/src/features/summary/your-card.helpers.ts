import {
  amountMinorSchema,
  CARD_SUMMARY_KIND,
  CURRENCY,
  formatAmount,
  formatDayInWords,
  type PreparedCard,
} from "@xtrakto/core";
import type { AccountRow, CardFigures } from "@xtrakto/db";
import { accountLabel, isCard } from "@/utils/account-label.helpers";
import { boxAmount, exactSize } from "@/utils/money-text.utils";
import { SUMMARY_COPY } from "./summary.constants";
import type { AccountSummary, YourCardView } from "./summary.types";

const COPY = SUMMARY_COPY.card;

/** "Resumen de tu tarjeta" for a card (12.3c), else "Resumen de tu cuenta de ahorros". */
export const summaryTitle = (account: AccountRow): string =>
  isCard(account) ? SUMMARY_COPY.cardTitle : SUMMARY_COPY.title;

// The debt at the cut: Bancolombia's previous balance and charges, less its
// payments and what's in its favor; Nu's total to pay, which clears it
// (12.2a).
const debtOf = ({ summary, totalPaymentMinor }: PreparedCard) => {
  if (summary.kind !== CARD_SUMMARY_KIND.BANCOLOMBIA) return totalPaymentMinor;
  const { chargesMinor, paymentsMinor, creditInFavorMinor } = summary.total;
  return amountMinorSchema.parse(
    chargesMinor - paymentsMinor - creditInFavorMinor,
  );
};

const exact = (amount: number): string =>
  formatAmount(amountMinorSchema.parse(amount), CURRENCY.COP);

// What its latest statement that reconciles says: the debt on the day it
// was cut, what's due and by when, and its limit.
const figuresOf = ({ card, period }: CardFigures) => {
  const cut = formatDayInWords(card.cutDate ?? period.to);
  const debt = debtOf(card);
  return {
    debt: {
      label: `${debt < 0 ? COPY.inFavorOn : COPY.debtOn} ${cut}`,
      amount: exact(Math.abs(debt)),
    },
    due: card.dueDate
      ? {
          label: `${COPY.dueOn} ${formatDayInWords(card.dueDate)}`,
          payments: [
            { label: COPY.minimum, value: exact(card.minimumPaymentMinor) },
            { label: COPY.total, value: exact(card.totalPaymentMinor) },
          ],
        }
      : { label: COPY.nothingDue, payments: [] },
    figures: [
      { label: COPY.limit, value: boxAmount(card.creditLimitMinor) },
      { label: COPY.available, value: boxAmount(card.availableMinor) },
    ],
  };
};

// A statement of the period that doesn't reconcile comes first: none of
// its numbers count. Then the latest that does; else the month misses its
// statement.
const statusOf = (
  verified: CardFigures | undefined,
  broken: CardFigures | undefined,
): YourCardView["status"] => {
  if (broken)
    return {
      tone: "attention",
      title:
        broken.differenceMinor === null || broken.differenceMinor === 0
          ? COPY.doesNotReconcile
          : `${COPY.doesNotReconcile} ${COPY.by} ${exactSize(broken.differenceMinor)}`,
      detail: COPY.checkFile,
    };
  return verified
    ? { tone: "ok", title: COPY.verified, detail: COPY.verifiedDetail }
    : { tone: "none", title: COPY.noStatement, detail: COPY.noStatementDetail };
};

/**
 * "Tu tarjeta" (12.3c): its latest statement of the period that reconciles,
 * with the debt on the day it was cut, what's due and by when, its limit
 * and what's available, and whether its bank's sums check its statements.
 * A statement that doesn't reconcile shows no figures, as none of its
 * numbers count.
 */
export const yourCardView = ({
  account,
  cardFigures,
}: Pick<AccountSummary, "account" | "cardFigures">): YourCardView => {
  const verified = cardFigures.findLast(({ isVerified }) => isVerified);
  const broken = cardFigures.findLast(({ isVerified }) => !isVerified);
  return {
    ...(verified ? figuresOf(verified) : { figures: [] }),
    account: accountLabel(account, account.last4),
    status: statusOf(verified, broken),
  };
};
