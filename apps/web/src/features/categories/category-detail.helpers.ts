import {
  type AmountMinor,
  amountMinorSchema,
  type CalendarMonth,
  type CalendarQuarter,
  CATEGORIES,
  type CategoryId,
  channelOf,
  CURRENCY,
  formatDayInWords,
  formatMonthName,
  formatSignedAmount,
  NO_DESCRIPTION,
  sumAmounts,
} from "@xtrakto/core";
import type { PeriodMovement, TransactionListItem } from "@xtrakto/db";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";
import { periodLinkOf } from "@/components/period-controls/period-options.helpers";
import { categoryLabel } from "@/utils/category-label.helpers";
import { countText, formatCount } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { boxAmount, compactSize } from "@/utils/money-text.utils";
import { periodWords } from "@/utils/period-words.helpers";
import {
  type MovementPeriod,
  periodParam,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import { ruleRows, shareText } from "./categories.helpers";
import { CATEGORIES_COPY, NAMED_RULES } from "./categories.constants";
import type {
  CategoryDetail,
  CategoryFigure,
  CategorySettings,
  CategoryTiles,
  LatestFooter,
  LatestRow,
  MonthBox,
} from "./categories.types";

const COPY = CATEGORIES_COPY;

// An average is written to the peso: 100 of its minor units.
const MINOR_PER_PESO = 100;

/**
 * The category a detail's URL names, when it's one of real spending: only
 * those rows open their detail (docs/ui/v8-05).
 */
export const spendingCategoryOf = (param: string): CategoryId | undefined =>
  CATEGORIES.find(({ id, kind }) => id === param && kind === "spending")?.id;

/** "Gasto real · julio a septiembre de 2026". */
export const detailSubtitle = (period: MovementPeriod): string =>
  `${COPY.detail.kind} · ${periodWords(period).toLowerCase()}`;

type Movements = Pick<CategoryDetail, "categoryId" | "movements">;

// The category's movements in the period, the oldest first.
const ofCategory = ({ categoryId, movements }: Movements) =>
  movements.filter((movement) => movement.categoryId === categoryId);

const totalOf = (movements: readonly PeriodMovement[]): AmountMinor =>
  sumAmounts(movements.map(({ amountMinor }) => amountMinor));

// "Total del trimestre": what the category took, how many movements and its
// share of the real spending, as Categorías counts it.
const totalFigure = (
  { period, summary }: Pick<CategoryDetail, "period" | "summary">,
  movements: readonly PeriodMovement[],
): CategoryFigure => {
  const total = totalOf(movements);
  const share = shareText(total, summary.kinds.spending.amountMinor);
  return {
    label:
      period.kind === "quarter"
        ? COPY.detail.totalQuarter
        : `${COPY.detail.totalOf} ${formatMonthName(period).toLowerCase()}`,
    amount: boxAmount(total),
    note: `${countText(movements.length, COPY.spending.movements)} · ${share} ${COPY.spending.ofSpending}.`,
  };
};

// The largest movement, the first of a tie.
const largestOf = (movements: readonly PeriodMovement[]) =>
  movements.reduce<PeriodMovement | undefined>(
    (largest, movement) =>
      largest === undefined ||
      Math.abs(movement.amountMinor) > Math.abs(largest.amountMinor)
        ? movement
        : largest,
    undefined,
  );

// "Promedio por movimiento", to the peso, and the largest movement:
// "El más alto: $186.000, el 12 de agosto."
const averageFigure = (
  movements: readonly PeriodMovement[],
): CategoryFigure => {
  const minor = Math.abs(totalOf(movements)) / movements.length;
  const average = amountMinorSchema.parse(
    Math.round(minor / MINOR_PER_PESO) * MINOR_PER_PESO,
  );
  const largest = largestOf(movements);
  const day = largest === undefined ? "" : formatDayInWords(largest.date);
  return {
    label: COPY.detail.average,
    amount: boxAmount(average),
    note:
      movements.length === 1 || largest === undefined
        ? `${COPY.detail.onlyOne} ${day}.`
        : `${COPY.detail.largest} ${boxAmount(largest.amountMinor)}, ${COPY.detail.on} ${day}.`,
  };
};

// A quarter's months, each with its key in dates: "2026-07".
const monthsOf = ({ year, quarter }: CalendarQuarter) =>
  [1, 2, 3].map((nth) => {
    const month: CalendarMonth = { year, month: quarter * 3 - 3 + nth };
    return { month, key: periodParam({ kind: "month", ...month }) };
  });

/**
 * What the category took each month of a quarter, those the account has
 * movements in, the one it took the most marked when there are several.
 * None for a month.
 */
export const monthBoxes = (
  detail: Pick<CategoryDetail, "period" | "categoryId" | "movements">,
): readonly MonthBox[] => {
  const { period, movements } = detail;
  if (period.kind === "month") return [];
  const mine = ofCategory(detail);
  const months = monthsOf(period)
    .filter(({ key }) => movements.some(({ date }) => date.startsWith(key)))
    .map(({ month, key }) => {
      const took = mine.filter(({ date }) => date.startsWith(key));
      return { month, key, took: Math.abs(totalOf(took)) };
    });
  const most = Math.max(...months.map(({ took }) => took));
  const mostAt =
    months.length > 1 && most > 0
      ? months.findIndex(({ took }) => took === most)
      : -1;
  return months.map(({ month, key, took }, index) => ({
    key,
    label: formatMonthName(month),
    amount: compactSize(amountMinorSchema.parse(took)),
    isMost: index === mostAt,
  }));
};

/**
 * The tiles of a category's detail (docs/ui/v8-06): its total, its average
 * and largest movement, and each month of a quarter. None without
 * movements of the category in the period.
 */
export const categoryTiles = (
  detail: Pick<
    CategoryDetail,
    "period" | "summary" | "categoryId" | "movements"
  >,
): CategoryTiles | undefined => {
  const mine = ofCategory(detail);
  if (mine.length === 0) return undefined;
  return {
    total: totalFigure(detail, mine),
    average: averageFigure(mine),
    months: monthBoxes(detail),
  };
};

/** "Los más recientes primero.", or that the category took nothing. */
export const latestSubtitle = (detail: Movements): string =>
  ofCategory(detail).length === 0
    ? `${COPY.detail.noneIn} «${categoryLabel(detail.categoryId)}» ${COPY.detail.inPeriod}`
    : COPY.latest.subtitle;

type Links = PeriodChoices & Pick<CategoryDetail, "categoryId">;

// Movimientos, with the category's movements and their detail.
const movementsHref = (detail: Links, movementId?: string) =>
  transactionsHref({
    ...periodLinkOf(detail),
    category: detail.categoryId,
    ...(movementId === undefined ? {} : { movementId }),
  });

const hasDescription = ({ descriptionRaw }: TransactionListItem): boolean =>
  descriptionRaw.trim() !== NO_DESCRIPTION;

/**
 * The category's newest movements: the bank's text as printed, the day,
 * the channel, whether its category is a guess, and its amount; each opens
 * its detail in Movimientos.
 */
export const latestRows = (
  detail: Links & Pick<CategoryDetail, "latest">,
): readonly LatestRow[] =>
  detail.latest.map((item) => ({
    id: item.id,
    title: hasDescription(item)
      ? item.descriptionRaw
      : COPY.latest.noDescription,
    hasDescription: hasDescription(item),
    date: formatDayInWords(item.date),
    channel: channelOf(item.descriptionRaw)?.labelEs,
    isPendingReview: item.isPendingReview,
    amount: formatSignedAmount(item.amountMinor, CURRENCY.COP),
    href: movementsHref(detail, item.id),
  }));

/**
 * "Mostrando 4 de 31" and "Ver los 31 movimientos", the category's in
 * Movimientos. None without movements of the category in the period.
 */
export const latestFooter = (
  detail: Links & Pick<CategoryDetail, "latest" | "movements">,
): LatestFooter | undefined => {
  const total = ofCategory(detail).length;
  if (total === 0) return undefined;
  const { shown, all } = COPY.latest;
  return {
    status: `${shown.before} ${formatCount(detail.latest.length)} ${shown.of} ${formatCount(total)}`,
    label:
      total === 1
        ? COPY.latest.one
        : `${all.before} ${formatCount(total)} ${all.after}`,
    href: movementsHref(detail),
  };
};

// "RETIRO CAJERO CENTRO, RETIRO CORRESPONSAL CB y 2 más", in the order of
// "Tus reglas".
const rulesNote = (rules: CategoryDetail["rules"]): string => {
  const texts = ruleRows(rules).map(({ text }) => text);
  const named = texts.slice(0, NAMED_RULES);
  const others = texts.length - named.length;
  return others === 0
    ? joined(named)
    : joined([...named, `${formatCount(others)} ${COPY.settings.more}`]);
};

/** "Ajustes de esta categoría": what it counts as, and the user's rules for it. */
export const categorySettings = ({
  categoryId,
  rules,
}: Pick<CategoryDetail, "categoryId" | "rules">): CategorySettings => ({
  countsAs: `${categoryLabel(categoryId)} ${COPY.settings.alwaysAdds}`,
  rulesTitle:
    rules.length === 0
      ? COPY.settings.noRules
      : countText(rules.length, COPY.settings.rules),
  rulesNote: rules.length === 0 ? COPY.settings.noRulesNote : rulesNote(rules),
  hasRules: rules.length > 0,
});
