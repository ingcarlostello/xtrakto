import type { CategoryId } from "../categories/category.types";
import { GMF_TAX_RULE_ID } from "../categorization/categorization.constants";
import { compareLocalDates, daysBetween } from "../dates/date.helpers";
import type { CalendarMonth, LocalDate, Period } from "../dates/date.types";
import { isAmountMinor, sumAmounts } from "../money/money.helpers";
import { MIN_RECURRING_MONTHS } from "../recurring/recurring.constants";
import type { RecurringPayment } from "../recurring/recurring.types";
import { totalOfMovements } from "../summary/summary.helpers";
import type { SummaryMovement } from "../summary/summary.types";
import type {
  GmfTaxInsight,
  NewRecurringInsight,
  NoDetailInsight,
  RecurringRoseInsight,
  SavingsYieldInsight,
  StatementFigures,
} from "./insights.types";

const DAYS_A_YEAR = 365;
const MONTHS_A_YEAR = 12;
const PERCENT = 100;

const monthIndex = ({ year, month }: CalendarMonth): number =>
  year * MONTHS_A_YEAR + month - 1;

const monthIndexOf = (date: LocalDate): number =>
  monthIndex({
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
  });

/**
 * The 4x1000 charged among a period's movements: how much, how many times,
 * and from which day to which. None when it wasn't charged.
 */
export const gmfTaxInsight = (
  movements: readonly SummaryMovement[],
): GmfTaxInsight | undefined => {
  // The table's rule only takes money out.
  const charged = movements.filter((m) => m.categoryRuleId === GMF_TAX_RULE_ID);
  const days = charged.map(({ date }) => date).sort(compareLocalDates);
  const [from] = days;
  const to = days.at(-1);
  if (from === undefined || to === undefined) return undefined;
  return {
    kind: "gmf_tax",
    total: totalOfMovements(charged),
    days: { from, to },
  };
};

// The money that went out through a category whose movements don't say
// what they paid.
const noDetailInsight =
  (kind: NoDetailInsight["kind"], categoryId: CategoryId) =>
  (movements: readonly SummaryMovement[]): NoDetailInsight | undefined => {
    const out = movements.filter(
      (m) => m.categoryId === categoryId && m.amountMinor < 0,
    );
    return out.length === 0
      ? undefined
      : { kind, total: totalOfMovements(out) };
  };

/** The cash withdrawn in a period, which paid no one we know. None without. */
export const cashInsight = noDetailInsight("cash", "cash_withdrawal");

/** The payments through gateways, which don't say the store. None without. */
export const gatewaysInsight = noDetailInsight(
  "payment_gateways",
  "payment_gateways",
);

/**
 * What the account's savings earned over its quarterly statements: their
 * interest, their average balance over their days, and the effective annual
 * rate that makes, compounded daily as the bank pays it. None without a
 * statement that printed both figures, or without interest.
 */
export const savingsYieldInsight = (
  figures: readonly StatementFigures[],
): SavingsYieldInsight | undefined => {
  const printed = figures.flatMap(
    ({ period, averageBalanceMinor, interestMinor }) =>
      averageBalanceMinor !== null && interestMinor !== null
        ? [
            {
              days: daysBetween(period.from, period.to),
              averageBalanceMinor,
              interestMinor,
            },
          ]
        : [],
  );
  const interestMinor = sumAmounts(printed.map((f) => f.interestMinor));
  const days = printed.reduce((total, f) => total + f.days, 0);
  const balanceDays = printed.reduce(
    (total, f) => total + f.averageBalanceMinor * f.days,
    0,
  );
  // Without a statement there are no days, and the average is no amount.
  const averageBalanceMinor = Math.round(balanceDays / days);
  if (
    interestMinor <= 0 ||
    !isAmountMinor(averageBalanceMinor) ||
    averageBalanceMinor <= 0
  )
    return undefined;
  const dailyRate = interestMinor / balanceDays;
  return {
    kind: "savings_yield",
    interestMinor,
    averageBalanceMinor,
    annualRatePercent: ((1 + dailyRate) ** DAYS_A_YEAR - 1) * PERCENT,
  };
};

/**
 * The fixed payments that became fixed in a period: their third month in a
 * row fell in it, and the account has movements in the month before their
 * first, which didn't repeat them. None without movements before them.
 */
export const newRecurringInsights = (
  spending: readonly RecurringPayment[],
  {
    period,
    movements,
  }: {
    readonly period: Period;
    readonly movements: readonly { readonly date: LocalDate }[];
  },
): NewRecurringInsight[] => {
  const withMovements = new Set(
    movements.map(({ date }) => monthIndexOf(date)),
  );
  return spending.flatMap((payment) => {
    const [first] = payment.months;
    if (first === undefined) return [];
    const began = monthIndex(first.month);
    const third = began + MIN_RECURRING_MONTHS - 1;
    const isInPeriod =
      third >= monthIndexOf(period.from) && third <= monthIndexOf(period.to);
    return isInPeriod && withMovements.has(began - 1)
      ? [{ kind: "new_recurring", payment, since: first.month }]
      : [];
  });
};

/**
 * The fixed payments whose amount rose (`AmountTrend` "rose"), from their
 * first month to their last, the most first: by percent, then by money.
 */
export const risenRecurringInsights = (
  spending: readonly RecurringPayment[],
): RecurringRoseInsight[] =>
  spending
    .flatMap((payment): RecurringRoseInsight[] => {
      const [from] = payment.months;
      const to = payment.months.at(-1);
      if (payment.trend.kind !== "rose" || !from || !to) return [];
      const rise = Math.abs(to.amountMinor) - Math.abs(from.amountMinor);
      if (!isAmountMinor(rise)) return [];
      return [
        {
          kind: "recurring_rose",
          payment,
          percent: payment.trend.percent,
          from,
          to,
          riseMinor: rise,
        },
      ];
    })
    .sort((a, b) => b.percent - a.percent || b.riseMinor - a.riseMinor);
