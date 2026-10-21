import {
  type CategoryId,
  type CategoryTotal,
  CHANNELS,
  cashInsight,
  channelOf,
  gatewaysInsight,
  gmfTaxInsight,
  type InsightText,
  insightText,
  isWithinPeriod,
  monthPeriod,
  type Period,
  type RecurringPayment,
} from "@xtrakto/core";
import type { PeriodMovement } from "@xtrakto/db";
import { channelWords } from "@/utils/channel-text.utils";
import { countText } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { boxAmount } from "@/utils/money-text.utils";
import { periodDays } from "@/utils/transactions-url.helpers";
import { labelOf, percentOf } from "./glance.helpers";
import { SUMMARY_COPY } from "./summary.constants";
import type { AccountSummary, SpendingTile } from "./summary.types";

const COPY = SUMMARY_COPY.where;
// Two rows of two (v8-01): the categories that weigh most, and the bank's
// costs when it charged the 4x1000.
const TILES = 4;
const BANK_COSTS: CategoryId = "taxes_and_fees";

// The money out that doesn't say what it paid, by its category.
const NO_DETAIL: ReadonlyMap<CategoryId, typeof cashInsight> = new Map([
  ["cash_withdrawal", cashInsight],
  ["payment_gateways", gatewaysInsight],
]);

// "19% de tu gasto real.", or "Menos del 1% …" for a sliver of it.
const shareText = (part: number, whole: number): string => {
  const percent = percentOf(part, whole);
  return percent === 0
    ? `${COPY.lessThan} 1% ${COPY.ofSpending}`
    : `${percent}% ${COPY.ofSpending}`;
};

// The fixed payments of a category paid in some days.
const paidIn = (
  payments: readonly RecurringPayment[],
  { categoryId, days }: { categoryId: CategoryId; days: Period },
): RecurringPayment[] =>
  payments.filter(
    (payment) =>
      payment.categoryId === categoryId &&
      payment.months.some(({ month }) =>
        isWithinPeriod(monthPeriod(month).from, days),
      ),
  );

// "1 cuota, entre el 1 y el 4 de cada mes.": the fixed payments, and the
// days of the month they go out on.
const fixedText = (
  payments: readonly RecurringPayment[],
): string | undefined => {
  const [one] = payments;
  if (one === undefined) return undefined;
  const first = Math.min(...payments.map(({ days }) => days.first));
  const last = Math.max(...payments.map(({ days }) => days.last));
  const noun =
    one.categoryId === "loan_payment" ? COPY.installments : COPY.fixed;
  const days =
    first === last
      ? `${COPY.onDay} ${first}`
      : `${COPY.between} ${first} ${COPY.andThe} ${last}`;
  return `${countText(payments.length, noun)}, ${days} ${COPY.eachMonth}.`;
};

// "58 pagos por Nequi, QR y transferencia.": how many went out, and the
// channels they took, the most used first.
const paymentsText = (
  { categoryId, count }: CategoryTotal,
  movements: readonly PeriodMovement[],
): string => {
  const used = new Map<string, number>();
  for (const movement of movements) {
    if (movement.categoryId !== categoryId || movement.amountMinor >= 0)
      continue;
    const channel = channelOf(movement.descriptionRaw);
    if (channel) used.set(channel.id, (used.get(channel.id) ?? 0) + 1);
  }
  const channels = CHANNELS.filter(({ id }) => used.has(id))
    .sort((a, b) => (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0))
    .map(({ id }) => id);
  const by =
    channels.length > 0 ? ` ${COPY.by} ${joined(channelWords(channels))}` : "";
  return `${countText(count, COPY.payments)}${by}.`;
};

// What the bank's text doesn't say, in its insight's words: the cash
// withdrawn, or what a gateway paid.
const noDetailOf = (
  categoryId: CategoryId,
  movements: readonly PeriodMovement[],
): InsightText | undefined => {
  const insight = NO_DETAIL.get(categoryId)?.(movements);
  return insight && insightText(insight);
};

// A category's share of the real spending, and what we know of it: what its
// bank text doesn't say, its fixed payments, or its payments and channels.
const categoryTile = (
  row: CategoryTotal,
  { movements, summary, fixedPayments, period }: AccountSummary,
): SpendingTile => {
  const noDetail = noDetailOf(row.categoryId, movements);
  const fixed = paidIn(fixedPayments, {
    categoryId: row.categoryId,
    days: periodDays(period),
  });
  const fact = noDetail
    ? `${noDetail.title}. ${noDetail.note}`
    : (fixedText(fixed) ?? paymentsText(row, movements));
  const label = labelOf(row.categoryId);
  return {
    categoryId: row.categoryId,
    title: noDetail?.needsAttention ? `${label} · ${COPY.check}` : label,
    amount: boxAmount(row.amountMinor),
    note: `${shareText(row.amountMinor, summary.kinds.spending.amountMinor)} ${fact}`,
    needsAttention: noDetail?.needsAttention ?? false,
  };
};

// "Costos del banco · revisar", when the bank charged the 4x1000, in its
// insight's words: "Te cobraron 4x1000 del 10 al 18 de julio, en 9 cobros.
// Revisa si tu cuenta es exenta."
const bankCostsTile = ({
  movements,
  summary,
}: AccountSummary): SpendingTile | undefined => {
  const row = summary.spendingByCategory.find(
    ({ categoryId }) => categoryId === BANK_COSTS,
  );
  const gmfTax = gmfTaxInsight(movements);
  if (row === undefined || gmfTax === undefined) return undefined;
  const { title, note } = insightText(gmfTax);
  return {
    categoryId: BANK_COSTS,
    title: `${labelOf(BANK_COSTS)} · ${COPY.check}`,
    amount: boxAmount(row.amountMinor),
    note: `${title} ${note.charAt(0).toLowerCase()}${note.slice(1)}`,
    needsAttention: true,
  };
};

/**
 * "Dónde se fue más" (docs/ui/v8-01): the categories that weigh most in
 * real spending, each with its share and what we know of it, and the bank's
 * costs when it charged the 4x1000, to check. Four at most; none without
 * real spending.
 */
export const spendingTiles = (
  summary: AccountSummary,
): readonly SpendingTile[] => {
  const bankCosts = bankCostsTile(summary);
  const categories = summary.summary.spendingByCategory
    .filter(
      ({ categoryId }) => bankCosts === undefined || categoryId !== BANK_COSTS,
    )
    .slice(0, bankCosts === undefined ? TILES : TILES - 1)
    .map((row) => categoryTile(row, summary));
  return bankCosts === undefined ? categories : [...categories, bankCosts];
};
