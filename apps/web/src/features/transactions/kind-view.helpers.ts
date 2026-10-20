import {
  categoriesOfKind,
  type CategoryKind,
  categoryKind,
  CURRENCY,
  formatSignedCompactAmount,
  type KindTotals,
  type MovementTotal,
} from "@xtrakto/core";
import type { MovementSelection, TransactionListItem } from "@xtrakto/db";
import type { MovementTone } from "@/components/movement-icon/movement-icon.types";
import { countText, formatCount } from "@/utils/count-text.utils";
import {
  type MovementFilter,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import type { ListLink } from "./transaction-list.helpers";
import { TRANSACTIONS_COPY } from "./transaction.constants";
import type { FilterOption, KindTile } from "./transaction.types";

const COPY = TRANSACTIONS_COPY.kinds;

// The interface calls money that only moved "moved"; categories, "internal".
const TONE_OF_KIND = {
  income: "income",
  spending: "spending",
  internal: "moved",
} as const satisfies Record<CategoryKind, MovementTone>;

const KIND_OF_FILTER = {
  income: "income",
  spending: "spending",
  moved: "internal",
} as const satisfies Record<Exclude<MovementFilter, "review">, CategoryKind>;

const signed = (total: MovementTotal) =>
  formatSignedCompactAmount(total.amountMinor, CURRENCY.COP);

// Money that moved shows each direction it went: "−$29,8M · +$2,8M".
const movedTile = ({ out, back }: KindTotals["moved"]): KindTile => {
  const directions = [
    { total: out, noun: COPY.out },
    { total: back, noun: COPY.back },
  ].filter(({ total }) => total.count > 0);
  if (directions.length === 0)
    return {
      tone: "moved",
      label: COPY.moved,
      totals: [signed(out)],
      detail: countText(0, TRANSACTIONS_COPY.movements),
    };
  return {
    tone: "moved",
    label: COPY.moved,
    totals: directions.map(({ total }) => signed(total)),
    detail: directions
      .map(({ total, noun }) => countText(total.count, noun))
      .join(" · "),
  };
};

/** The tiles of a period's kinds (docs/ui/v8-03), with compact totals. */
export const kindTiles = (totals: KindTotals): readonly KindTile[] => [
  {
    tone: "income",
    label: COPY.income,
    totals: [signed(totals.income)],
    detail: countText(totals.income.count, TRANSACTIONS_COPY.movements),
  },
  {
    tone: "spending",
    label: COPY.spending,
    totals: [signed(totals.spending)],
    detail: countText(totals.spending.count, TRANSACTIONS_COPY.movements),
  },
  movedTile(totals.moved),
];

/**
 * A movement's colors: its kind's, or neutral while its category is only a
 * guess, when it has none, or when it counts nowhere (design-system.md §3.4).
 */
export const movementTone = (
  { categoryId, isPendingReview }: TransactionListItem,
  isCounted: boolean,
): MovementTone => {
  if (!isCounted || isPendingReview || categoryId === null) return "neutral";
  const kind = categoryKind(categoryId);
  return kind === undefined ? "neutral" : TONE_OF_KIND[kind];
};

/** Which movements a filter keeps: a kind's categories, or those to review. */
export const selectionOf = (filter?: MovementFilter): MovementSelection => {
  if (filter === undefined) return {};
  if (filter === "review") return { isPendingReview: true };
  return { categoryIds: categoriesOfKind(KIND_OF_FILTER[filter]) };
};

/** "Todo / Ingresos / Gasto real / Movido / Por revisar · 24", as links. */
export const filterOptions = (
  link: ListLink,
  pendingReview: number,
): readonly FilterOption[] => {
  const option = (label: string, filter?: MovementFilter): FilterOption => ({
    label,
    href: transactionsHref({ ...link, filter }),
    isCurrent: link.filter === filter,
  });
  return [
    option(COPY.all),
    option(COPY.income, "income"),
    option(COPY.spending, "spending"),
    option(COPY.moved, "moved"),
    option(`${COPY.review} · ${formatCount(pendingReview)}`, "review"),
  ];
};
