import {
  type AmountMinor,
  amountMinorSchema,
  type AmountTrend,
  type CalendarMonth,
  CHANNELS,
  CURRENCY,
  formatAmount,
  formatDayInWords,
  formatMonthName,
  formatShortMonth,
  formatSignedAmount,
  insightText,
  isAmountMinor,
  type RecurringPayment,
  type RecurringPayments,
  recurringPaymentTitle,
  risenRecurringInsights,
  sumAmounts,
} from "@xtrakto/core";
import type { FilterChip } from "@/components/filter-chips/filter-chips.types";
import type { HrefOf } from "@/components/period-controls/period-controls.types";
import { periodLinkOf } from "@/components/period-controls/period-options.helpers";
import { countText, formatCount } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { compactSize } from "@/utils/money-text.utils";
import {
  type RecurringFilter,
  recurringHref,
} from "@/utils/transactions-url.helpers";
import { RECURRING_COPY as COPY } from "./recurring.constants";
import { isSameMonth, monthBefore, paidMonth } from "./recurring.helpers";
import type {
  AccountRecurring,
  MonthBar,
  RecurringRowView,
  RecurringTile,
  RecurringView,
} from "./recurring.types";

const MONTHS_A_YEAR = 12;

const CHANNEL_LABELS: ReadonlyMap<string, string> = new Map(
  CHANNELS.map(({ id, labelEs }) => [id, labelEs]),
);

/** A month in running text: `"septiembre"`. */
export const monthWord = (month: CalendarMonth): string =>
  formatMonthName(month).toLowerCase();

// What some money adds up to, without its direction: "$1.540.000".
const withoutSign = (amount: AmountMinor): string => {
  const size = Math.abs(amount);
  return formatAmount(isAmountMinor(size) ? size : amount, CURRENCY.COP);
};

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

/**
 * "Ordenados por monto. Las barras muestran julio, agosto y septiembre.", or
 * for the payments that stopped, "Se repetían cada mes, pero no aparecen en
 * septiembre. …".
 */
export const listSubtitle = (
  month: CalendarMonth,
  view: RecurringView = "active",
): string => {
  const first =
    view === "active"
      ? COPY.sorted
      : `${COPY.stoppedSubtitle} ${monthWord(month)}.`;
  return `${first} ${COPY.barsShow} ${joined(barMonths(month).map(monthWord))}.`;
};

/** "No hay pagos fijos en septiembre." */
export const noneText = (month: CalendarMonth): string =>
  `${COPY.noneIn} ${monthWord(month)}.`;

/** "Total en septiembre", and what the fixed payments added up to in it. */
export const monthTotal = (
  spending: readonly RecurringPayment[],
  month: CalendarMonth,
): { readonly label: string; readonly amount: string } => ({
  label: `${COPY.totalIn} ${monthWord(month)}`,
  amount: formatSignedAmount(
    sumAmounts(
      spending.flatMap(
        (payment) => paidMonth(payment, month)?.amountMinor ?? [],
      ),
    ),
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
    Math.abs(paidMonth(payment, m)?.amountMinor ?? 0),
  );
  const most = Math.max(...sizes, 1);
  return months.map((m, index) => {
    const paid = paidMonth(payment, m);
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

// "2 cuotas: $1.540.000 y $311.000.", when the month held several.
const installmentsOf = (payment: RecurringPayment, month: CalendarMonth) => {
  const payments = paidMonth(payment, month)?.payments ?? [];
  if (payments.length < 2) return undefined;
  const noun =
    payment.categoryId === "loan_payment" ? COPY.installments : COPY.payments;
  return `${countText(payments.length, noun)}: ${joined(payments.map(withoutSign))}.`;
};

// When it was last paid, for one that stopped; or that it hasn't come yet
// in the page's month, for one still expected in it.
const noteOf = (
  payment: RecurringPayment,
  month: CalendarMonth,
  view: RecurringView,
): string | undefined => {
  if (view === "stopped")
    return `${COPY.lastPaid} ${formatDayInWords(payment.lastDate)}.`;
  return paidMonth(payment, month) === undefined
    ? `${COPY.notYet} ${monthWord(month)}.`
    : undefined;
};

// Its month's amount, else its latest; or the range it moves in when it
// moves a lot.
const amountOf = (payment: RecurringPayment, month: CalendarMonth): string => {
  if (payment.trend.kind !== "variable")
    return formatSignedAmount(
      (paidMonth(payment, month) ?? payment.months.at(-1))?.amountMinor ??
        payment.typicalAmountMinor,
      CURRENCY.COP,
    );
  const bySize = payment.months
    .map(({ amountMinor }) => amountMinor)
    .sort((a, b) => Math.abs(a) - Math.abs(b));
  const least = bySize[0] ?? payment.typicalAmountMinor;
  const most = bySize.at(-1) ?? payment.typicalAmountMinor;
  return `${withoutSign(least)} ${COPY.rangeTo} ${withoutSign(most)}`;
};

/** A payment as its row reads, in the page's month and the list it's in. */
export const rowView = (
  payment: RecurringPayment,
  month: CalendarMonth,
  view: RecurringView = "active",
): RecurringRowView => {
  const [bankText = payment.label, ...others] = payment.bankTexts;
  const installmentsText = installmentsOf(payment, month);
  const note = noteOf(payment, month, view);
  return {
    key: `${payment.label}-${payment.referenceLast4 ?? ""}-${payment.categoryId}`,
    categoryId: payment.categoryId,
    title: recurringPaymentTitle(payment),
    bankText,
    ...(others.length > 0
      ? {
          alsoText: `${COPY.also} ${others.map((text) => `“${text}”`).join(", ")}.`,
        }
      : {}),
    ...(installmentsText === undefined ? {} : { installmentsText }),
    ...(note === undefined ? {} : { note }),
    cadence: cadenceOf(payment),
    channels: payment.channels.map((id) => CHANNEL_LABELS.get(id) ?? id),
    trend: trendView(payment.trend),
    hasSeveralChannels: payment.channels.length > 1,
    amount: amountOf(payment, month),
  };
};

/** What a payment takes in a month: its latest month's amount. */
export const latestAmountOf = (payment: RecurringPayment): AmountMinor =>
  payment.months.at(-1)?.amountMinor ?? payment.typicalAmountMinor;

// "Lo que suman estos 7 pagos en 12 meses."
const yearlyCaption = (count: number): string =>
  count === 1
    ? COPY.tiles.yearlyOne
    : `${COPY.tiles.yearlyOther} ${formatCount(count)} ${COPY.tiles.yearlyOtherEnd}`;

// The payment that rose the most (`risenRecurringInsights`), in its
// insight's words, with the rise of its last month.
const roseTile = (
  spending: readonly RecurringPayment[],
): RecurringTile | undefined => {
  const [most] = risenRecurringInsights(spending);
  if (most === undefined) return undefined;
  const { title, note } = insightText(most);
  return {
    kind: "rose",
    categoryId: most.payment.categoryId,
    label: title,
    amount: formatSignedAmount(most.riseMinor, CURRENCY.COP),
    caption: note,
  };
};

/**
 * The tiles above the list (docs/ui/v8-04): what the fixed payments take each
 * month, each one's latest; that in twelve months; and the one that rose the
 * most, when one did. None without fixed payments.
 */
export const recurringTiles = (
  spending: readonly RecurringPayment[],
): readonly RecurringTile[] => {
  if (spending.length === 0) return [];
  const monthly = sumAmounts(spending.map(latestAmountOf));
  const yearly = amountMinorSchema.parse(monthly * MONTHS_A_YEAR);
  const rose = roseTile(spending);
  return [
    {
      kind: "monthly",
      label: COPY.tiles.monthly,
      amount: compactSize(monthly),
      caption: COPY.tiles.monthlyCaption,
    },
    {
      kind: "yearly",
      label: COPY.tiles.yearly,
      amount: compactSize(yearly),
      caption: yearlyCaption(spending.length),
    },
    ...(rose === undefined ? [] : [rose]),
  ];
};

/** What the list shows: the payments that stopped when the URL asks and some did. */
export const viewOf = (
  filter: RecurringFilter | undefined,
  stopped: readonly RecurringPayment[],
): RecurringView =>
  filter === "stopped" && stopped.length > 0 ? "stopped" : "active";

/** The page's links to another account or period, which keep its list. */
export const recurringHrefOf =
  (view: RecurringView): HrefOf =>
  (link) =>
    recurringHref({ ...link, ...(view === "stopped" ? { filter: view } : {}) });

/** "Activos · 7 / Ya no aparecen · 1", as links; none when nothing stopped. */
export const listFilters = (
  recurring: AccountRecurring,
  view: RecurringView,
): readonly FilterChip[] => {
  if (recurring.stopped.length === 0) return [];
  const link = periodLinkOf(recurring);
  return [
    {
      label: `${COPY.active} · ${formatCount(recurring.payments.spending.length)}`,
      href: recurringHref(link),
      isCurrent: view === "active",
    },
    {
      label: `${COPY.stopped} · ${formatCount(recurring.stopped.length)}`,
      href: recurringHref({ ...link, filter: "stopped" }),
      isCurrent: view === "stopped",
    },
  ];
};
