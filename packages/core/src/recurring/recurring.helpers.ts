import { categoryKind } from "../categories/category.helpers";
import type { CategoryId } from "../categories/category.types";
import { channelOf, payeeOf } from "../categorization/channel.helpers";
import type { CalendarMonth, LocalDate } from "../dates/date.types";
import { sumAmounts } from "../money/money.helpers";
import type { AmountMinor } from "../money/money.types";
import {
  AMOUNT_TOLERANCE_PERCENT,
  MAX_DAY_SPREAD,
  MIN_RECURRING_MONTHS,
  TREND_PERCENT,
} from "./recurring.constants";
import {
  isNumberPayee,
  type PayeePayments,
  paymentsByPayee,
} from "./recurring-payee.helpers";
import type {
  AmountTrend,
  RecurringMovement,
  RecurringPayment,
  RecurringPayments,
} from "./recurring.types";

/** A month a payee was paid in, numbered so that months in a row follow. */
type PaidMonth = {
  readonly index: number;
  readonly month: CalendarMonth;
  readonly payments: readonly RecurringMovement[];
  readonly amountMinor: AmountMinor;
};

const MONTHS_A_YEAR = 12;

const monthIndexOf = (date: LocalDate): number =>
  Number(date.slice(0, 4)) * MONTHS_A_YEAR + Number(date.slice(5, 7)) - 1;

const dayOf = (date: LocalDate): number => Number(date.slice(8, 10));

const size = (amount: AmountMinor): number => Math.abs(amount);

// The middle value by `sizeOf`: the larger middle one of an even count.
const middleBy = <T>(values: readonly T[], sizeOf: (value: T) => number) =>
  [...values].sort((a, b) => sizeOf(a) - sizeOf(b))[
    Math.floor(values.length / 2)
  ];

const spreadPercent = (values: readonly number[], typical: number): number =>
  ((Math.max(...values) - Math.min(...values)) * 100) / typical;

const monthsOf = (payments: readonly RecurringMovement[]): PaidMonth[] => {
  const byIndex = new Map<number, RecurringMovement[]>();
  for (const payment of payments) {
    const index = monthIndexOf(payment.date);
    const month = byIndex.get(index);
    if (month === undefined) byIndex.set(index, [payment]);
    else month.push(payment);
  }
  return [...byIndex]
    .sort(([a], [b]) => a - b)
    .map(([index, inMonth]) => ({
      index,
      month: {
        year: Math.floor(index / MONTHS_A_YEAR),
        month: (index % MONTHS_A_YEAR) + 1,
      },
      payments: inMonth,
      amountMinor: sumAmounts(inMonth.map(({ amountMinor }) => amountMinor)),
    }));
};

// Months that look like one payment: on near days and, for real spending,
// near the typical amount.
const lookAlike = (
  months: readonly PaidMonth[],
  isSpending: boolean,
): boolean => {
  const days = months.flatMap(({ payments }) =>
    payments.map(({ date }) => dayOf(date)),
  );
  if (Math.max(...days) - Math.min(...days) > MAX_DAY_SPREAD) return false;
  const typical = middleBy(months, ({ amountMinor }) => size(amountMinor));
  if (!isSpending || typical === undefined) return true;
  const expected = size(typical.amountMinor);
  return months.every(
    ({ amountMinor }) =>
      Math.abs(size(amountMinor) - expected) * 100 <=
      expected * AMOUNT_TOLERANCE_PERCENT,
  );
};

// Months in a row, the latest run first.
const runsOf = (months: readonly PaidMonth[]): PaidMonth[][] => {
  const runs: PaidMonth[][] = [];
  for (const month of months) {
    const run = runs.at(-1);
    if (run !== undefined && run.at(-1)?.index === month.index - 1)
      run.push(month);
    else runs.push([month]);
  }
  return runs.reverse();
};

/**
 * The months a payment repeats in: the latest run of months in a row whose
 * last three look alike, with the earlier ones of the run that still look
 * like them. `undefined` when no run does.
 */
const repeatingMonths = (
  months: readonly PaidMonth[],
  isSpending: boolean,
): PaidMonth[] | undefined => {
  for (const run of runsOf(months)) {
    let start = run.length - MIN_RECURRING_MONTHS;
    if (start < 0 || !lookAlike(run.slice(start), isSpending)) continue;
    while (start > 0 && lookAlike(run.slice(start - 1), isSpending)) start -= 1;
    return run.slice(start);
  }
  return undefined;
};

// How much the last month rose over the first, in percent, when it's the
// highest one after months that varied little.
const riseOf = (amounts: readonly number[]): number | undefined => {
  const [first] = amounts;
  const earlier = amounts.slice(0, -1);
  const last = amounts.at(-1);
  const typical = middleBy(earlier, (amount) => amount);
  if (first === undefined || last === undefined || typical === undefined)
    return undefined;
  if (last <= Math.max(...earlier)) return undefined;
  if (spreadPercent(earlier, typical) > TREND_PERCENT.VARIES_LITTLE)
    return undefined;
  const percent = Math.round(((last - first) * 100) / first);
  return percent >= TREND_PERCENT.MIN_RISE ? percent : undefined;
};

const trendOf = (
  months: readonly PaidMonth[],
  typical: number,
): AmountTrend => {
  const amounts = months.map(({ amountMinor }) => size(amountMinor));
  const spread = spreadPercent(amounts, typical);
  if (spread <= TREND_PERCENT.STABLE) return { kind: "stable" };
  const rise = riseOf(amounts);
  if (rise !== undefined) return { kind: "rose", percent: rise };
  return spread <= TREND_PERCENT.VARIES_LITTLE
    ? { kind: "varies_little" }
    : { kind: "variable" };
};

// Who was paid as the bank wrote it, without its channel's words.
const labelOf = (descriptionRaw: string): string =>
  descriptionRaw
    .trim()
    .split(/\s+/)
    .slice(payeeOf(descriptionRaw).channelWords)
    .join(" ");

// What a payment's months say of it, paid to `payee` and of `categoryId`.
const paymentOf = (
  { payee, categoryId }: { payee: string; categoryId: CategoryId },
  months: readonly PaidMonth[],
): RecurringPayment | undefined => {
  const typical = middleBy(months, ({ amountMinor }) => size(amountMinor));
  const paid = months.flatMap((month) => month.payments);
  const last = paid.at(-1);
  if (typical === undefined || last === undefined) return undefined;
  const days = paid.map(({ date }) => dayOf(date));
  const isNumber = isNumberPayee(payee);
  const latestFirst = [...paid].reverse();
  return {
    label: isNumber ? last.descriptionRaw : labelOf(last.descriptionRaw),
    referenceLast4: isNumber ? last.referenceLast4 : null,
    bankTexts: [...new Set(latestFirst.map((p) => p.descriptionRaw))],
    categoryId,
    channels: [
      ...new Set(paid.flatMap((p) => channelOf(p.descriptionRaw)?.id ?? [])),
    ],
    months: months.map(({ month, amountMinor, payments: inMonth }) => ({
      month,
      amountMinor,
      count: inMonth.length,
    })),
    typicalAmountMinor: typical.amountMinor,
    days: { first: Math.min(...days), last: Math.max(...days) },
    lastDate: last.date,
    trend: trendOf(months, size(typical.amountMinor)),
  };
};

// A payee's payments that repeat, of the kind of the latest one.
const recurringPaymentOf = ({
  payee,
  payments,
}: PayeePayments): RecurringPayment | undefined => {
  const latest = payments.at(-1);
  if (latest === undefined || latest.categoryId === null) return undefined;
  const isSpending = categoryKind(latest.categoryId) === "spending";
  const months = repeatingMonths(monthsOf(payments), isSpending);
  return months === undefined
    ? undefined
    : paymentOf({ payee, categoryId: latest.categoryId }, months);
};

/**
 * The payments that repeat among an account's movements: to one payee in at
 * least three months in a row, on near days and, for real spending, for
 * near amounts, however the bank wrote them and whatever channel paid them.
 * Real spending apart from what only moves, each the largest first.
 */
export const findRecurringPayments = (
  movements: readonly RecurringMovement[],
): RecurringPayments => {
  const found = paymentsByPayee(movements)
    .flatMap((group) => recurringPaymentOf(group) ?? [])
    .sort((a, b) => size(b.typicalAmountMinor) - size(a.typicalAmountMinor));
  return {
    spending: found.filter(
      ({ categoryId }) => categoryKind(categoryId) === "spending",
    ),
    moved: found.filter(
      ({ categoryId }) => categoryKind(categoryId) === "internal",
    ),
  };
};
