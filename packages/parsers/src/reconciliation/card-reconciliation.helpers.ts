import {
  CARD_SUMMARY_KIND,
  isAmountMinor,
  isWithinPeriod,
  roundUpToWholeUnit,
  sumAmounts,
} from "@xtrakto/core";
import type {
  AmountMinor,
  CardStatement,
  CardSummary,
  ParsedStatement,
} from "@xtrakto/core";
import { NU_INTEREST_TEXT, NU_ROW_TEXT } from "../nu/nu.constants";
import { RECONCILIATION_ISSUE } from "./reconciliation.constants";
import type {
  Reconciliation,
  ReconciliationIssueCode,
} from "./reconciliation.types";

type BancolombiaSummary = Extract<
  CardSummary,
  { kind: typeof CARD_SUMMARY_KIND.BANCOLOMBIA }
>;
type NuSummary = Extract<CardSummary, { kind: typeof CARD_SUMMARY_KIND.NU }>;

// Each check's issue and whether it held, and by how much the debt is off.
type CardChecks = {
  readonly checks: readonly (readonly [ReconciliationIssueCode, boolean])[];
  readonly differenceMinor: AmountMinor;
};

// A card's sums and differences stay within safe integers, as the amounts do.
const amount = (value: number): AmountMinor => {
  if (!isAmountMinor(value)) {
    throw new RangeError("A card's sum left the safe integer range");
  }
  return value;
};

// What the installments still charge after this month's.
const remainingOf = ({ transactions }: ParsedStatement): AmountMinor =>
  sumAmounts(
    transactions.flatMap(({ installment }) =>
      installment?.remainingMinor === undefined
        ? []
        : [installment.remainingMinor],
    ),
  );

// The previous balance and the month's charges.
const chargesOf = (total: BancolombiaSummary["total"]): AmountMinor =>
  sumAmounts([
    total.previousBalanceMinor,
    total.purchasesMinor,
    total.lateInterestMinor,
    total.interestMinor,
    total.advancesMinor,
    total.otherChargesMinor,
  ]);

// What the minimum is made of, before it's rounded up.
const dueOf = (minimum: BancolombiaSummary["minimum"]): AmountMinor =>
  amount(
    sumAmounts([
      minimum.installmentsMinor,
      minimum.earlierInstallmentsMinor,
      minimum.advanceInstallmentsMinor,
      minimum.lateInterestMinor,
      minimum.interestMinor,
      minimum.otherChargesMinor,
      minimum.overdueMinor,
    ]) - minimum.inFavorMinor,
  );

// The movements of the period; those of earlier statements are already in
// the previous balance.
const movedOf = ({ transactions, period }: ParsedStatement): AmountMinor =>
  sumAmounts(
    transactions
      .filter(({ date }) => isWithinPeriod(date, period))
      .map(({ amountMinor }) => amountMinor),
  );

// Bancolombia's sums (Appendix A.4): the previous balance and the month's
// charges, the debt they and the payments leave, the minimum, what the
// installments leave beside it, and the movements of the period, which take
// the previous balance to the debt; the total and the minimum rounded up.
const bancolombiaChecks = (
  statement: ParsedStatement,
  card: CardStatement,
  { total, minimum }: BancolombiaSummary,
): CardChecks => {
  const debt = amount(
    total.chargesMinor - total.paymentsMinor - total.creditInFavorMinor,
  );
  const due = dueOf(minimum);
  const differenceMinor = amount(
    total.previousBalanceMinor - debt - movedOf(statement),
  );
  return {
    checks: [
      [
        RECONCILIATION_ISSUE.CARD_CHARGES,
        chargesOf(total) === total.chargesMinor,
      ],
      [
        RECONCILIATION_ISSUE.CARD_TOTAL,
        roundUpToWholeUnit(debt) === card.totalPaymentMinor,
      ],
      [
        RECONCILIATION_ISSUE.CARD_MINIMUM,
        roundUpToWholeUnit(due) === card.minimumPaymentMinor,
      ],
      [
        RECONCILIATION_ISSUE.CARD_INSTALLMENTS,
        remainingOf(statement) + due === debt,
      ],
      [RECONCILIATION_ISSUE.CARD_MOVEMENTS, differenceMinor === 0],
    ],
    differenceMinor,
  };
};

// What the movements Nu's parser words as `text` charge, as a positive amount.
const chargedAs = (
  { transactions }: ParsedStatement,
  text: string,
): AmountMinor =>
  amount(
    -sumAmounts(
      transactions
        .filter(({ descriptionNormalized }) => descriptionNormalized === text)
        .map(({ amountMinor }) => amountMinor),
    ),
  );

// Nu's sums the rows' movements give (12.2d): the conversion charges, and the
// month's interest and late interest, each the summary's line.
const nuMovementChecks = (
  statement: ParsedStatement,
  summary: NuSummary,
): CardChecks["checks"] => [
  [
    RECONCILIATION_ISSUE.CARD_CONVERSION,
    chargedAs(statement, NU_ROW_TEXT.CONVERSION) ===
      summary.conversionChargesMinor,
  ],
  [
    RECONCILIATION_ISSUE.CARD_INTEREST,
    chargedAs(statement, NU_INTEREST_TEXT.INTEREST) === summary.interestMinor &&
      chargedAs(statement, NU_INTEREST_TEXT.LATE) ===
        (summary.lateInterestMinor ?? 0),
  ],
];

// Nu's sums (Appendix A.5): the minimum from the month's due, interest, fees
// and payments; the total from the minimum and the remaining debt; the
// remaining debt from what the installments leave; and the movements' charges.
const nuChecks = (
  statement: ParsedStatement,
  card: CardStatement,
  summary: NuSummary,
): CardChecks => {
  const minimum = amount(
    sumAmounts([
      summary.dueThisMonthMinor,
      summary.interestMinor,
      summary.advanceFeesMinor,
      summary.serviceFeesMinor,
      summary.conversionChargesMinor,
    ]) -
      summary.paymentsToMinimumMinor -
      summary.refundsMinor,
  );
  const total = amount(
    card.minimumPaymentMinor +
      summary.remainingDebtMinor -
      summary.paymentsToTotalMinor,
  );
  return {
    checks: [
      [RECONCILIATION_ISSUE.CARD_MINIMUM, minimum === card.minimumPaymentMinor],
      [RECONCILIATION_ISSUE.CARD_TOTAL, total === card.totalPaymentMinor],
      [
        RECONCILIATION_ISSUE.CARD_INSTALLMENTS,
        remainingOf(statement) === summary.remainingDebtMinor,
      ],
      ...nuMovementChecks(statement, summary),
    ],
    differenceMinor: amount(card.totalPaymentMinor - total),
  };
};

/**
 * Checks a card statement by its bank's own sums (12.2a), exact in minor
 * units, since a card prints no balance after each movement: Bancolombia's
 * charges, debt, minimum, installments and movements, and Nu's minimum, total,
 * installments, conversion charges and interest. Its difference is by how much the debt is off: the
 * movements' for Bancolombia, the total's for Nu.
 */
export const reconcileCard = (
  statement: ParsedStatement,
  card: CardStatement,
): Reconciliation => {
  const { summary } = card;
  const { checks, differenceMinor } =
    summary.kind === CARD_SUMMARY_KIND.BANCOLOMBIA
      ? bancolombiaChecks(statement, card, summary)
      : nuChecks(statement, card, summary);
  const issues = checks.flatMap(([code, held]) => (held ? [] : [{ code }]));
  return {
    balanceVerified: issues.length === 0,
    issues,
    closingDifferenceMinor: differenceMinor,
  };
};
