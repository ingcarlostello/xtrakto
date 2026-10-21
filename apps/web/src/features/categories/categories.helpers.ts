import {
  type AmountMinor,
  type CategoryMoved,
  type CategoryTotal,
  categoryKind,
  CURRENCY,
  formatMonthName,
  formatSignedCompactAmount,
  gatewaysInsight,
  insightText,
  type PeriodSummary,
  type UserCategoryRule,
} from "@xtrakto/core";
import type { PeriodMovement } from "@xtrakto/db";
import { categoryLabel } from "@/utils/category-label.helpers";
import { channelWords, usedChannels } from "@/utils/channel-text.helpers";
import { countText } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { boxAmount, compactSize } from "@/utils/money-text.utils";
import { percentOf } from "@/utils/percent.utils";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  CATEGORIES_COPY as COPY,
  KIND_WORDS,
  MOVED_LABELS,
} from "./categories.constants";
import type {
  AccountCategories,
  GatewaysTile,
  MovedView,
  RuleRow,
  SpendingRow,
} from "./categories.types";

const capitalized = (text: string): string =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// A bar's length against the largest, never less than a sliver to see.
const barOf = (amount: number, largest: number): number =>
  Math.max(1, percentOf(amount, largest));

/** "$24,4M en el trimestre, de mayor a menor.", or that nothing was spent. */
export const spendingSubtitle = (
  period: MovementPeriod,
  { kinds }: PeriodSummary,
): string => {
  if (kinds.spending.count === 0) return COPY.spending.none;
  const when =
    period.kind === "quarter"
      ? COPY.spending.inQuarter
      : `${COPY.spending.inMonth} ${formatMonthName(period).toLowerCase()}`;
  return `${compactSize(kinds.spending.amountMinor)} ${when}, ${COPY.spending.largestFirst}`;
};

/** A category's share of the real spending: "19%", or "menos del 1%". */
export const shareText = (amount: number, spending: number): string => {
  const percent = percentOf(amount, spending);
  return percent === 0 ? `${COPY.spending.lessThan} 1%` : `${percent}%`;
};

// "19% de tu gasto real · 3 movimientos · PSE": its share, how many, and
// the channels its money went out through, the most used first.
const spendingNote = (
  { categoryId, amountMinor, count }: CategoryTotal,
  { summary, movements }: Pick<AccountCategories, "summary" | "movements">,
): string => {
  const share = shareText(amountMinor, summary.kinds.spending.amountMinor);
  const channels = usedChannels(
    movements
      .filter((m) => m.categoryId === categoryId && m.amountMinor < 0)
      .map(({ descriptionRaw }) => descriptionRaw),
  );
  return [
    `${share} ${COPY.spending.ofSpending}`,
    countText(count, COPY.spending.movements),
    ...(channels.length > 0
      ? [capitalized(joined(channelWords(channels)))]
      : []),
  ].join(" · ");
};

/**
 * "Tu gasto real por categoría" (docs/ui/v8-05): each category of real
 * spending, the largest first, with its bar against the largest, its share,
 * how many movements and their channels.
 */
export const spendingRows = (
  categories: Pick<AccountCategories, "summary" | "movements">,
): readonly SpendingRow[] => {
  const rows = categories.summary.spendingByCategory;
  const largest = rows[0]?.amountMinor ?? 0;
  return rows.map((row) => ({
    categoryId: row.categoryId,
    label: categoryLabel(row.categoryId),
    amount: boxAmount(row.amountMinor),
    barPercent: barOf(row.amountMinor, largest),
    note: spendingNote(row, categories),
  }));
};

// "Salieron $29,8M y volvieron $2,8M. Todo sigue siendo tuyo."
const movedSubtitle = ({ out, back }: PeriodSummary["kinds"]["moved"]) => {
  if (out.count === 0 && back.count === 0) return COPY.moved.none;
  const said =
    out.count === 0
      ? `${COPY.moved.cameBack} ${compactSize(back.amountMinor)}.`
      : back.count === 0
        ? `${COPY.moved.wentOut} ${compactSize(out.amountMinor)}.`
        : `${COPY.moved.wentOut} ${compactSize(out.amountMinor)} ${COPY.moved.and} ${compactSize(back.amountMinor)}.`;
  return `${said} ${COPY.moved.stillYours}`;
};

const signed = (amount: AmountMinor): string =>
  formatSignedCompactAmount(amount, CURRENCY.COP);

/**
 * "Movido no es gasto" (docs/ui/v8-05): where money only moved, the most
 * first, each with its bar against the most, and then what came back,
 * which isn't income.
 */
export const movedView = ({
  kinds,
  movedByCategory,
}: PeriodSummary): MovedView => {
  const out = movedByCategory.filter((moved) => moved.out.count > 0);
  const most = out[0]?.out.amountMinor ?? 0;
  const { back } = kinds.moved;
  return {
    subtitle: movedSubtitle(kinds.moved),
    rows: [
      ...out.map(({ categoryId, out: moved }: CategoryMoved) => ({
        key: categoryId,
        categoryId,
        label: MOVED_LABELS[categoryId] ?? categoryLabel(categoryId),
        amount: signed(moved.amountMinor),
        barPercent: barOf(moved.amountMinor, most),
      })),
      ...(back.count > 0
        ? [
            {
              key: "back",
              categoryId: "own_account_transfer" as const,
              label: COPY.moved.back,
              amount: signed(back.amountMinor),
              note: COPY.moved.backNote,
            },
          ]
        : []),
    ],
  };
};

/**
 * The payments through gateways, which don't say the store, in their
 * insight's words on the attention surface. None without them.
 */
export const gatewaysTile = (
  movements: readonly PeriodMovement[],
): GatewaysTile | undefined => {
  const insight = gatewaysInsight(movements);
  if (insight === undefined) return undefined;
  const { title, note, needsAttention } = insightText(insight);
  return {
    categoryId: "payment_gateways",
    title,
    amount: boxAmount(insight.total.amountMinor),
    note,
    needsAttention,
  };
};

// "Si sale: Entre tus cuentas · movido".
const meaningOf = (rule: UserCategoryRule): string => {
  const kind = categoryKind(rule.categoryId);
  const label = categoryLabel(rule.categoryId);
  const said = kind === undefined ? label : `${label} · ${KIND_WORDS[kind]}`;
  if (rule.target === "reference") return said;
  return `${rule.direction === "out" ? COPY.rules.out : COPY.rules.in} ${said}`;
};

const textOf = (rule: UserCategoryRule): string =>
  rule.target === "description"
    ? rule.descriptionFolded
    : `${COPY.rules.reference} ${rule.referenceLast4 ?? ""}`.trim();

/**
 * "Tus reglas": what each of the user's rules holds for and what it says,
 * the bank's texts in alphabetical order and then the numbers.
 */
export const ruleRows = (
  rules: readonly UserCategoryRule[],
): readonly RuleRow[] =>
  [...rules]
    .sort(
      (a, b) =>
        Number(a.target === "reference") - Number(b.target === "reference") ||
        textOf(a).localeCompare(textOf(b), "es") ||
        meaningOf(a).localeCompare(meaningOf(b), "es"),
    )
    .map((rule) => ({
      key:
        rule.target === "description"
          ? `${rule.descriptionFolded}-${rule.direction}`
          : rule.referenceHash,
      text: textOf(rule),
      meaning: meaningOf(rule),
    }));
