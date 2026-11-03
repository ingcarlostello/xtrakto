import {
  formatDaysInWords,
  formatMonthName,
} from "../dates/date-display.helpers";
import type { CalendarMonth } from "../dates/date.types";
import { CURRENCY } from "../money/money.constants";
import {
  formatAmount,
  formatCompactAmount,
  isAmountMinor,
} from "../money/money.helpers";
import type { AmountMinor } from "../money/money.types";
import {
  recurringPaymentInText,
  recurringPaymentService,
  recurringPaymentTitle,
} from "../recurring/recurring-title.helpers";
import type { RecurringPayment } from "../recurring/recurring.types";
import { INSIGHT_COPY as COPY } from "./insights.constants";
import type {
  GmfTaxInsight,
  Insight,
  InsightText,
  NewRecurringInsight,
  RecurringRoseInsight,
  SavingsYieldInsight,
} from "./insights.types";

type Noun = { readonly one: string; readonly other: string };

const COUNT_FORMAT = new Intl.NumberFormat("es-CO");
const PERCENT_FORMAT = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});
// Under this rate, in percent, two decimals write 0: "Menos del 0,01%".
const LEAST_PERCENT = 0.005;

// "1 cobro", "9 cobros".
const countText = (count: number, { one, other }: Noun): string =>
  `${COUNT_FORMAT.format(count)} ${count === 1 ? one : other}`;

const capitalized = (text: string): string =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const monthWord = (month: CalendarMonth): string =>
  formatMonthName(month).toLowerCase();

// Some money without its direction: "$162.300".
const withoutSign = (amount: AmountMinor): string => {
  const size = Math.abs(amount);
  return formatAmount(isAmountMinor(size) ? size : amount, CURRENCY.COP);
};

// "Del 10 al 18 de julio, en 9 cobros. Revisa si tu cuenta es exenta."
const gmfTaxText = ({ total, days }: GmfTaxInsight): InsightText => {
  const { gmfTax: copy } = COPY;
  return {
    title: copy.title,
    note: `${capitalized(formatDaysInWords(days))}, ${copy.in} ${countText(total.count, copy.charges)}. ${copy.check}`,
    needsAttention: true,
  };
};

// "Un 0,05% efectivo anual sobre tu saldo promedio de $10,4M."
const savingsYieldText = ({
  averageBalanceMinor,
  annualRatePercent,
}: SavingsYieldInsight): InsightText => {
  const { savingsYield: copy } = COPY;
  const rate =
    annualRatePercent < LEAST_PERCENT
      ? `${copy.lessThan} ${copy.least}%`
      : `${copy.rate} ${PERCENT_FORMAT.format(annualRatePercent)}%`;
  return {
    title: copy.title,
    note: `${rate} ${copy.annual} ${formatCompactAmount(averageBalanceMinor, CURRENCY.COP)}.`,
    needsAttention: false,
  };
};

// "Nuevo pago fijo: energía" and "Se repite desde julio, el día 10."
const newRecurringText = ({
  payment,
  since,
}: NewRecurringInsight): InsightText => {
  const { newRecurring: copy } = COPY;
  const { first, last } = payment.days;
  const days =
    first === last
      ? `${copy.onDay} ${first}`
      : `${copy.between} ${first} ${copy.andThe} ${last}`;
  return {
    title: `${copy.title} ${recurringPaymentInText(payment)}`,
    note: `${copy.since} ${monthWord(since)}, ${days}.`,
    needsAttention: false,
  };
};

// What to look at when a fixed payment rose, by what it pays for: a home
// service's use or rate, a plan's price, a loan's rate or charges, else why.
const checkOf = (payment: RecurringPayment): string => {
  const { check } = COPY.recurringRose;
  const service = recurringPaymentService(payment);
  if (
    service === "phone_internet" ||
    service === "tv" ||
    payment.categoryId === "subscriptions"
  )
    return check.plan;
  if (payment.categoryId === "utilities") return check.usage;
  return payment.categoryId === "loan_payment" ? check.loan : check.other;
};

// "Energía subió 12%" and "De $162.300 en julio a $182.000 en septiembre.
// Revisa tu consumo o la tarifa."
const recurringRoseText = ({
  payment,
  percent,
  from,
  to,
}: RecurringRoseInsight): InsightText => {
  const { recurringRose: copy } = COPY;
  return {
    title: `${recurringPaymentTitle(payment)} ${copy.rose} ${percent}%`,
    note: `${copy.from} ${withoutSign(from.amountMinor)} ${copy.in} ${monthWord(from.month)} ${copy.to} ${withoutSign(to.amountMinor)} ${copy.in} ${monthWord(to.month)}. ${checkOf(payment)}`,
    needsAttention: true,
  };
};

/** An insight in words, its numbers written in, as its tile reads it. */
export const insightText = (insight: Insight): InsightText => {
  switch (insight.kind) {
    case "gmf_tax":
      return gmfTaxText(insight);
    case "savings_yield":
      return savingsYieldText(insight);
    case "cash":
      return {
        title: countText(insight.total.count, COPY.cash.title),
        note: COPY.cash.note,
        needsAttention: false,
      };
    case "payment_gateways":
      return {
        title: countText(insight.total.count, COPY.gateways.title),
        note: COPY.gateways.note,
        needsAttention: true,
      };
    case "new_recurring":
      return newRecurringText(insight);
    case "recurring_rose":
      return recurringRoseText(insight);
  }
};
