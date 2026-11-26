import {
  amountMinorSchema,
  type CategoryMoved,
  formatDayInWords,
  type Period,
  type PeriodSummary,
} from "@xtrakto/core";
import type { PeriodLink } from "@/components/period-controls/period-controls.types";
import { type CardCycles, pageDays } from "@/utils/card-cycles.helpers";
import { categoryLabel } from "@/utils/category-label.helpers";
import { countText, wordFor } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { compactSize } from "@/utils/money-text.utils";
import { percentOf } from "@/utils/percent.utils";
import { periodWords } from "@/utils/period-words.helpers";
import {
  type MovementFilter,
  type PagePeriod,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import {
  INCOME_NOUNS,
  MOVED_TO,
  SUMMARY_COPY as COPY,
} from "./summary.constants";
import type { GlanceTile } from "./summary.types";

// A note names the categories that weigh most, up to four (v8-01).
const NAMED_CATEGORIES = 4;

/** "Tu trimestre de un vistazo", "Tu mes de un vistazo", "Tu año de un vistazo". */
export const glanceTitle = ({ kind }: PagePeriod): string =>
  COPY.glanceTitle[kind];

const lowerFirst = (text: string): string =>
  `${text.charAt(0).toLocaleLowerCase("es-CO")}${text.slice(1)}`;

// What went out: "Salieron $54,2M, pero no todo fue gasto.", or that
// nothing did.
const outText = ({ outflows, kinds }: PeriodSummary): string => {
  if (outflows.count === 0) return COPY.nothingOut;
  const wentOut = `${COPY.wentOut} ${compactSize(outflows.amountMinor)}`;
  return kinds.moved.out.count > 0
    ? `${wentOut}, ${COPY.notAllSpending}.`
    : `${wentOut}.`;
};

// What went out with a card (12.3c): "Con tu tarjeta salieron $1,5M.", or
// that nothing did.
const cardOutText = ({ outflows, kinds }: PeriodSummary): string => {
  if (outflows.count === 0) return COPY.nothingOutOfCard;
  const wentOut = `${COPY.withCard} ${compactSize(outflows.amountMinor)}`;
  return kinds.moved.out.count > 0
    ? `${wentOut}, ${COPY.notAllSpending}.`
    : `${wentOut}.`;
};

// A card's cycles in words (12.3c): "12 de agosto a 10 de septiembre de
// 2026", with the first day's year too across a new year.
const cycleWords = ({ from, to }: Period): string => {
  const year = to.slice(0, 4);
  const start =
    from.slice(0, 4) === year
      ? formatDayInWords(from)
      : `${formatDayInWords(from)} ${COPY.of} ${from.slice(0, 4)}`;
  return `${start} ${COPY.cycleTo} ${formatDayInWords(to)} ${COPY.of} ${year}`;
};

/**
 * "Julio a septiembre de 2026. Salieron $54,2M, pero no todo fue gasto.",
 * or for a year (10.2c): "En 2026 salieron $54,2M, pero no todo fue gasto."
 * A card's (12.3c), by its cycles' days: "12 de agosto a 10 de septiembre
 * de 2026. Con tu tarjeta salieron $1,5M."
 */
export const glanceSubtitle = (
  period: PagePeriod,
  summary: PeriodSummary,
  cycles: CardCycles = null,
): string => {
  const sentence = cycles === null ? outText(summary) : cardOutText(summary);
  if (period.kind === "year")
    return `${COPY.inYear} ${period.year} ${lowerFirst(sentence)}`;
  const words =
    cycles === null
      ? periodWords(period)
      : cycleWords(pageDays(period, cycles));
  return `${words}. ${sentence}`;
};

// "El 85% llegó en 2 transferencias. No incluye $2,8M que volvió de tus
// cuentas." A card's money that came back is its payments, which its own
// tile counts (12.3c).
const incomeNote = (
  { kinds, incomeByCategory }: PeriodSummary,
  onCard: boolean,
): string => {
  const { back } = kinds.moved;
  const excludes =
    back.count > 0 && !onCard
      ? ` ${COPY.income.excludes} ${compactSize(back.amountMinor)} ${COPY.income.cameBack}`
      : "";
  const [largest] = incomeByCategory;
  if (largest === undefined)
    return `${onCard ? COPY.income.noRefund : COPY.income.none}${excludes}`;
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
    .map(({ categoryId }) => categoryLabel(categoryId));
  const names = joined([first, ...others.map((name) => name.toLowerCase())]);
  const percent = percentOf(kinds.spending.amountMinor, outflows.amountMinor);
  return `${COPY.the} ${percent}% ${COPY.spending.ofOut} ${names}.`;
};

/** Where some money went to the user's own: "a tu inversión y a tus tarjetas". */
export const movedPlaces = (moved: readonly CategoryMoved[]): string =>
  joined(
    moved
      .filter(({ out }) => out.count > 0)
      .map(
        ({ categoryId }) =>
          MOVED_TO[categoryId] ?? categoryLabel(categoryId).toLowerCase(),
      ),
  );

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
  const also =
    back.count > 0
      ? ` ${COPY.moved.also} ${compactSize(back.amountMinor)}.`
      : "";
  const percent = percentOf(out.amountMinor, outflows.amountMinor);
  return `${COPY.the} ${percent}% ${COPY.moved.ofOut} ${movedPlaces(movedByCategory)}.${also}`;
};

const actionOf = (label: string, link: PeriodLink, filter: MovementFilter) => ({
  label,
  href: transactionsHref({ ...link, filter }),
});

type Moved = PeriodSummary["kinds"]["moved"];

// "El 100% fueron 2 pagos a tu tarjeta. No es ingreso: es tu plata.", or
// "Además trajiste $2,0M de deuda de otro banco." after a balance transfer.
const cardMovedNote = ({ out, back }: Moved, all: number): string => {
  const brought = `${compactSize(out.amountMinor)} ${COPY.moved.debtFromBank}`;
  if (back.count === 0)
    return out.count === 0
      ? COPY.moved.noPayment
      : `${COPY.moved.brought} ${brought}`;
  const payments = `${COPY.the} ${percentOf(back.amountMinor, all)}% ${wordFor(back.count, COPY.moved.were)} ${countText(back.count, COPY.moved.payments)} ${COPY.moved.toCard}`;
  return out.count > 0
    ? `${payments} ${COPY.moved.alsoBrought} ${brought}`
    : `${payments} ${COPY.moved.isYourMoney}`;
};

// A card's money that only moved (12.3c): its payments, and the debt a
// balance transfer brought from another bank; its ring the payments' share.
const cardMovedTile = (moved: Moved, link: PeriodLink): GlanceTile => {
  const all = amountMinorSchema.parse(
    moved.back.amountMinor - moved.out.amountMinor,
  );
  return {
    tone: "moved",
    label: COPY.moved.label,
    percent: percentOf(moved.back.amountMinor, all),
    amount: compactSize(all),
    note: cardMovedNote(moved, all),
    action: actionOf(COPY.moved.cardAction, link, "moved"),
  };
};

/**
 * The three KPI tiles of "Tu trimestre de un vistazo" (docs/ui/v8-01): what
 * came in, its ring the share of its largest kind; the real spending and
 * what only moved, their rings their share of what went out; each with
 * what it means and the way to its movements. On a card (12.3c), what only
 * moved is its payments, its ring their share of it.
 */
export const glanceTiles = (
  summary: PeriodSummary,
  link: PeriodLink,
  onCard = false,
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
      note: incomeNote(summary, onCard),
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
    onCard
      ? cardMovedTile(kinds.moved, link)
      : {
          tone: "moved",
          label: COPY.moved.label,
          percent: percentOf(kinds.moved.out.amountMinor, outflows.amountMinor),
          amount: compactSize(kinds.moved.out.amountMinor),
          note: movedNote(summary),
          action: actionOf(COPY.moved.action, link, "moved"),
        },
  ];
};
