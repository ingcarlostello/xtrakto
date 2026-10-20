import {
  type AmountMinor,
  type AmountTrend,
  type CalendarMonth,
  CHANNELS,
  CURRENCY,
  formatAmount,
  formatMonthName,
  formatShortMonth,
  formatSignedAmount,
  isAmountMinor,
  type RecurringPayment,
  type RecurringPayments,
  sumAmounts,
} from "@xtrakto/core";
import { countText } from "@/utils/count-text.utils";
import { RECURRING_COPY as COPY } from "./recurring.constants";
import { isSameMonth, monthBefore } from "./recurring.helpers";
import type { MonthBar, RecurringRowView } from "./recurring.types";

const DOTS = "•••";

const CHANNEL_LABELS: ReadonlyMap<string, string> = new Map(
  CHANNELS.map(({ id, labelEs }) => [id, labelEs]),
);

const monthWord = (month: CalendarMonth): string =>
  formatMonthName(month).toLowerCase();

// "julio, agosto y septiembre".
const joined = (items: readonly string[]): string =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} ${COPY.and} ${items.at(-1)}`;

// What some money adds up to, without its direction: "$1.540.000".
const withoutSign = (amount: AmountMinor): string => {
  const size = Math.abs(amount);
  return formatAmount(isAmountMinor(size) ? size : amount, CURRENCY.COP);
};

const monthOf = (payment: RecurringPayment, month: CalendarMonth) =>
  payment.months.find((paid) => isSameMonth(paid.month, month));

/** "Encontramos 7 gastos fijos y 2 pagos que se repiten pero no son gasto." */
export const foundText = ({
  spending,
  moved,
}: RecurringPayments): string | undefined => {
  const parts = [
    ...(spending.length > 0 ? [countText(spending.length, COPY.fixed)] : []),
    ...(moved.length > 0 ? [countText(moved.length, COPY.repeating)] : []),
  ];
  return parts.length === 0
    ? undefined
    : `${COPY.found} ${parts.join(` ${COPY.and} `)}.`;
};

/** "Lo que se repite cada mes. Encontramos 7 gastos fijos y …". */
export const pageSubtitle = (payments: RecurringPayments): string =>
  [COPY.subtitle, foundText(payments)].filter(Boolean).join(" ");

/** The three months the bars show, the page's the last. */
export const barMonths = (month: CalendarMonth): readonly CalendarMonth[] =>
  [2, 1, 0].map((back) => monthBefore(month, back));

/** "Ordenados por monto. Las barras muestran julio, agosto y septiembre." */
export const listSubtitle = (month: CalendarMonth): string =>
  `${COPY.sorted} ${COPY.barsShow} ${joined(barMonths(month).map(monthWord))}.`;

/** "Total en septiembre", and what the fixed payments added up to in it. */
export const monthTotal = (
  spending: readonly RecurringPayment[],
  month: CalendarMonth,
): { readonly label: string; readonly amount: string } => ({
  label: `${COPY.totalIn} ${monthWord(month)}`,
  amount: formatSignedAmount(
    sumAmounts(spending.flatMap((p) => monthOf(p, month)?.amountMinor ?? [])),
    CURRENCY.COP,
  ),
});

/** A payment's bars for the page's three months, against the most of them. */
export const monthBars = (
  payment: RecurringPayment,
  month: CalendarMonth,
): readonly MonthBar[] => {
  const months = barMonths(month);
  const sizes = months.map((m) =>
    Math.abs(monthOf(payment, m)?.amountMinor ?? 0),
  );
  const most = Math.max(...sizes, 1);
  return months.map((m, index) => {
    const paid = monthOf(payment, m);
    return {
      key: `${m.year}-${m.month}`,
      label: formatShortMonth(m),
      text: `${formatMonthName(m)} ${paid ? withoutSign(paid.amountMinor) : COPY.unpaid}`,
      heightPercent: Math.round(((sizes[index] ?? 0) * 100) / most),
      isShown: isSameMonth(m, month),
    };
  });
};

const TRENDS = {
  stable: { label: COPY.trends.stable, variant: "ok" },
  varies_little: { label: COPY.trends.varies_little, variant: "neutral" },
  variable: { label: COPY.trends.variable, variant: "neutral" },
} as const;

const trendView = (trend: AmountTrend): RecurringRowView["trend"] =>
  trend.kind === "rose"
    ? { label: `${COPY.trends.rose} ${trend.percent}%`, variant: "spending" }
    : TRENDS[trend.kind];

// "Mensual · día 5", "Mensual · entre el 1 y el 4".
const cadenceOf = ({ days }: RecurringPayment): string =>
  days.first === days.last
    ? `${COPY.monthly} · ${COPY.onDay} ${days.first}`
    : `${COPY.monthly} · ${COPY.between} ${days.first} ${COPY.andThe} ${days.last}`;

// Who was paid, or the number paid by its channel: "Nequi ••• 1270".
const titleOf = ({ label, referenceLast4, channels }: RecurringPayment) =>
  referenceLast4 === null
    ? label
    : `${CHANNEL_LABELS.get(channels[0] ?? "") ?? label} ${DOTS} ${referenceLast4}`;

// "2 cuotas: $1.540.000 y $311.000.", when the month held several.
const installmentsOf = (payment: RecurringPayment, month: CalendarMonth) => {
  const payments = monthOf(payment, month)?.payments ?? [];
  if (payments.length < 2) return undefined;
  const noun =
    payment.categoryId === "loan_payment" ? COPY.installments : COPY.payments;
  return `${countText(payments.length, noun)}: ${joined(payments.map(withoutSign))}.`;
};

// Its month's amount, or the range it moves in when it moves a lot.
const amountOf = (payment: RecurringPayment, month: CalendarMonth): string => {
  if (payment.trend.kind !== "variable")
    return formatSignedAmount(
      monthOf(payment, month)?.amountMinor ?? payment.typicalAmountMinor,
      CURRENCY.COP,
    );
  const bySize = payment.months
    .map(({ amountMinor }) => amountMinor)
    .sort((a, b) => Math.abs(a) - Math.abs(b));
  const least = bySize[0] ?? payment.typicalAmountMinor;
  const most = bySize.at(-1) ?? payment.typicalAmountMinor;
  return `${withoutSign(least)} ${COPY.rangeTo} ${withoutSign(most)}`;
};

/** A payment as its row reads, in the page's month. */
export const rowView = (
  payment: RecurringPayment,
  month: CalendarMonth,
): RecurringRowView => {
  const [bankText = payment.label, ...others] = payment.bankTexts;
  const installmentsText = installmentsOf(payment, month);
  return {
    key: `${payment.label}-${payment.referenceLast4 ?? ""}-${payment.categoryId}`,
    categoryId: payment.categoryId,
    title: titleOf(payment),
    bankText,
    ...(others.length > 0
      ? {
          alsoText: `${COPY.also} ${others.map((text) => `“${text}”`).join(", ")}.`,
        }
      : {}),
    ...(installmentsText === undefined ? {} : { installmentsText }),
    cadence: cadenceOf(payment),
    channels: payment.channels.map((id) => CHANNEL_LABELS.get(id) ?? id),
    trend: trendView(payment.trend),
    hasSeveralChannels: payment.channels.length > 1,
    amount: amountOf(payment, month),
  };
};
