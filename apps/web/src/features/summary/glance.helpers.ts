import {
  CATEGORIES,
  type CategoryId,
  formatMonthName,
  type PeriodSummary,
} from "@xtrakto/core";
import type { PeriodLink } from "@/components/period-controls/period-controls.types";
import { countText } from "@/utils/count-text.utils";
import { compactSize } from "@/utils/money-text.utils";
import {
  type MovementFilter,
  type MovementPeriod,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import {
  INCOME_NOUNS,
  MOVED_TO,
  SUMMARY_COPY as COPY,
} from "./summary.constants";
import type { GlanceTile } from "./summary.types";

const PERCENT = 100;
// A note names the categories that weigh most, up to four (v8-01).
const NAMED_CATEGORIES = 4;

// What part of a whole some money is, in whole percent; 0 of nothing.
const percentOf = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((Math.abs(part) * PERCENT) / Math.abs(whole));

const labelOf = (categoryId: CategoryId): string =>
  CATEGORIES.find(({ id }) => id === categoryId)?.labelEs ?? categoryId;

// "a, b y c".
const joined = (items: readonly string[]): string =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} ${COPY.and} ${items.at(-1)}`;

// "Julio a septiembre de 2026", "Agosto de 2026".
const periodWords = (period: MovementPeriod): string => {
  if (period.kind === "month")
    return `${formatMonthName(period)} ${COPY.of} ${period.year}`;
  const first = { year: period.year, month: period.quarter * 3 - 2 };
  const last = { year: period.year, month: period.quarter * 3 };
  return `${formatMonthName(first)} ${COPY.to} ${formatMonthName(last).toLowerCase()} ${COPY.of} ${period.year}`;
};

/** "Tu trimestre de un vistazo", "Tu mes de un vistazo". */
export const glanceTitle = ({ kind }: MovementPeriod): string =>
  COPY.glanceTitle[kind];

/** "Julio a septiembre de 2026. Salieron $54,2M, pero no todo fue gasto." */
export const glanceSubtitle = (
  period: MovementPeriod,
  { outflows, kinds }: PeriodSummary,
): string => {
  if (outflows.count === 0) return `${periodWords(period)}. ${COPY.nothingOut}`;
  const wentOut = `${COPY.wentOut} ${compactSize(outflows.amountMinor)}`;
  return kinds.moved.out.count > 0
    ? `${periodWords(period)}. ${wentOut}, ${COPY.notAllSpending}.`
    : `${periodWords(period)}. ${wentOut}.`;
};

// "El 85% llegó en 2 transferencias. No incluye $2,8M que volvió de tus cuentas."
const incomeNote = ({ kinds, incomeByCategory }: PeriodSummary): string => {
  const { back } = kinds.moved;
  const excludes =
    back.count > 0
      ? ` ${COPY.income.excludes} ${compactSize(back.amountMinor)} ${COPY.income.cameBack}`
      : "";
  const [largest] = incomeByCategory;
  if (largest === undefined) return `${COPY.income.none}${excludes}`;
  const noun = INCOME_NOUNS[largest.categoryId] ?? COPY.anyIncome;
  const percent = percentOf(largest.amountMinor, kinds.income.amountMinor);
  return `${COPY.the} ${percent}% ${COPY.income.cameIn} ${countText(largest.count, noun)}.${excludes}`;
};

// "El 45% de lo que salió. Créditos, mercado, efectivo y pagos a personas."
const spendingNote = ({
  outflows,
  kinds,
  spendingByCategory,
}: PeriodSummary): string => {
  if (kinds.spending.count === 0) return COPY.spending.none;
  const [first = "", ...others] = spendingByCategory
    .slice(0, NAMED_CATEGORIES)
    .map(({ categoryId }) => labelOf(categoryId));
  const names = joined([first, ...others.map((name) => name.toLowerCase())]);
  const percent = percentOf(kinds.spending.amountMinor, outflows.amountMinor);
  return `${COPY.the} ${percent}% ${COPY.spending.ofOut} ${names}.`;
};

// "El 55% de lo que salió: a tu inversión y a tus tarjetas. Además volvieron $2,8M."
const movedNote = ({
  outflows,
  kinds,
  movedByCategory,
}: PeriodSummary): string => {
  const { out, back } = kinds.moved;
  if (out.count === 0)
    return back.count === 0
      ? COPY.moved.none
      : `${COPY.moved.cameBack} ${compactSize(back.amountMinor)}.`;
  const places = movedByCategory
    .filter((moved) => moved.out.count > 0)
    .map(
      ({ categoryId }) =>
        MOVED_TO[categoryId] ?? labelOf(categoryId).toLowerCase(),
    );
  const also =
    back.count > 0
      ? ` ${COPY.moved.also} ${compactSize(back.amountMinor)}.`
      : "";
  const percent = percentOf(out.amountMinor, outflows.amountMinor);
  return `${COPY.the} ${percent}% ${COPY.moved.ofOut} ${joined(places)}.${also}`;
};

const actionOf = (label: string, link: PeriodLink, filter: MovementFilter) => ({
  label,
  href: transactionsHref({ ...link, filter }),
});

/**
 * The three KPI tiles of "Tu trimestre de un vistazo" (docs/ui/v8-01): what
 * came in, its ring the share of its largest kind; the real spending and
 * what only moved, their rings their share of what went out; each with
 * what it means and the way to its movements.
 */
export const glanceTiles = (
  summary: PeriodSummary,
  link: PeriodLink,
): readonly GlanceTile[] => {
  const { outflows, kinds, incomeByCategory } = summary;
  return [
    {
      tone: "income",
      label: COPY.income.label,
      percent: percentOf(
        incomeByCategory[0]?.amountMinor ?? 0,
        kinds.income.amountMinor,
      ),
      amount: compactSize(kinds.income.amountMinor),
      note: incomeNote(summary),
      action: actionOf(COPY.income.action, link, "income"),
    },
    {
      tone: "spending",
      label: COPY.spending.label,
      percent: percentOf(kinds.spending.amountMinor, outflows.amountMinor),
      amount: compactSize(kinds.spending.amountMinor),
      note: spendingNote(summary),
      action: actionOf(COPY.spending.action, link, "spending"),
    },
    {
      tone: "moved",
      label: COPY.moved.label,
      percent: percentOf(kinds.moved.out.amountMinor, outflows.amountMinor),
      amount: compactSize(kinds.moved.out.amountMinor),
      note: movedNote(summary),
      action: actionOf(COPY.moved.action, link, "moved"),
    },
  ];
};
