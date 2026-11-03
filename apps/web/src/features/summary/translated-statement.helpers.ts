import {
  type CategoryId,
  formatDayInWords,
  isInLineFilter,
  type LineNote,
  MONEY_DIRECTION,
  type TranslatedLine,
  translatedLines,
} from "@xtrakto/core";
import type { PeriodMovement } from "@xtrakto/db";
import type { FilterChip } from "@/components/filter-chips/filter-chips.types";
import { descriptionView } from "@/components/movement-row/movement-row.helpers";
import type { PeriodLink } from "@/components/period-controls/period-controls.types";
import { periodLinkOf } from "@/components/period-controls/period-options.helpers";
import { movementTone } from "@/features/transactions/kind-view.helpers";
import {
  amountText,
  movementTags,
} from "@/features/transactions/transaction-list.helpers";
import { TRANSACTIONS_COPY } from "@/features/transactions/transaction.constants";
import { categoryLabel } from "@/utils/category-label.helpers";
import { formatCount } from "@/utils/count-text.utils";
import { boxAmount } from "@/utils/money-text.utils";
import {
  type MovementFilter,
  summaryHref,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import { GUESSED_AS, SUMMARY_COPY } from "./summary.constants";
import type {
  AccountSummary,
  TranslatedLineView,
  TranslatedStatementView,
} from "./summary.types";

const COPY = SUMMARY_COPY.translated;
const DAYS = SUMMARY_COPY.where;

// The card's filters in v8-01's order, "Todo" first.
const FILTERS = [undefined, "spending", "moved", "income", "review"] as const;

// What money that only moved out is, by where it went.
const MOVED_OUT: Partial<Record<CategoryId, string>> = {
  credit_card_payment: COPY.card,
  investment: COPY.toInvestment,
  own_account_transfer: COPY.toOwnAccount,
};

// "el día 5", "entre el 1 y el 4".
const daysText = ({ first, last }: { first: number; last: number }) =>
  first === last
    ? `${DAYS.onDay} ${first}`
    : `${DAYS.between} ${first} ${DAYS.andThe} ${last}`;

// "Con el del 30 de julio suman $39,8M.", "Con otros 3 suman $4,2M."
const sumText = (note: Extract<LineNote, { kind: "sum" }>) => {
  const others = note.otherDate
    ? `${COPY.withThe} ${formatDayInWords(note.otherDate)}`
    : `${COPY.withOthers} ${formatCount(note.others)}`;
  return `${others} ${COPY.addUpTo} ${boxAmount(note.totalMinor)}.`;
};

/** What a line means, in one sentence of the code's (design-system.md §9). */
export const noteText = (note: LineNote): string => {
  switch (note.kind) {
    case "guess": {
      const guess =
        GUESSED_AS[note.categoryId] ??
        categoryLabel(note.categoryId).toLowerCase();
      return `${COPY.weThink} ${guess}. ${COPY.confirm}`;
    }
    case "fixed":
      return `${COPY.repeats} ${daysText(note.days)} ${DAYS.eachMonth}.`;
    case "moved":
      return note.direction === MONEY_DIRECTION.IN
        ? COPY.cameBack
        : (MOVED_OUT[note.categoryId] ?? COPY.countsAs.internal);
    case "sum":
      return sumText(note);
    case "counts":
      return note.categoryKind === undefined
        ? COPY.unknown
        : COPY.countsAs[note.categoryKind];
  }
};

// Its title in plain words over the bank's text, or the bank's text alone.
const titleOf = (movement: PeriodMovement) => {
  const view = descriptionView(movement);
  if (view.kind === "bank") return { title: view.text, isBankText: true };
  return {
    title:
      view.kind === "titled" ? view.title : TRANSACTIONS_COPY.noDescription,
    isBankText: false,
    bankText: view.raw,
  };
};

const lineView = (
  { movement, note }: TranslatedLine<PeriodMovement>,
  link: PeriodLink & { readonly filter?: MovementFilter },
): TranslatedLineView => ({
  id: movement.id,
  categoryId: movement.categoryId,
  tone: movementTone(movement, true),
  ...titleOf(movement),
  note: noteText(note),
  channel: movementTags(movement, true).channel,
  isPendingReview: movement.isPendingReview,
  amount: amountText(movement.amountMinor),
  href: transactionsHref({ ...link, movementId: movement.id }),
});

const filterChips = (
  link: PeriodLink,
  { current, pending }: { current?: MovementFilter; pending: number },
): FilterChip[] =>
  FILTERS.map((filter) => ({
    label:
      filter === undefined
        ? COPY.filters.all
        : filter === "review"
          ? `${COPY.filters.review} · ${formatCount(pending)}`
          : COPY.filters[filter],
    href: summaryHref({ ...link, ...(filter ? { lines: filter } : {}) }),
    isCurrent: filter === current,
  }));

// "Ver los 312 movimientos", or "Ver el movimiento" for one.
const seeAllLabel = (count: number) =>
  count === 1
    ? COPY.seeOne
    : `${COPY.seeAll} ${formatCount(count)} ${TRANSACTIONS_COPY.movements.other}`;

/**
 * "Tu extracto, traducido" (docs/ui/v8-01) for a filter of the URL: its
 * chips, the lines it shows with what each means, and the way to its
 * movements in Movimientos.
 */
export const translatedStatementView = (
  summary: AccountSummary,
  filter?: MovementFilter,
): TranslatedStatementView => {
  const { movements, fixedPayments } = summary;
  const link = periodLinkOf(summary);
  const kept = movements.filter((m) => isInLineFilter(m, filter));
  const lines = translatedLines(movements, { filter, fixedPayments });
  return {
    filters: filterChips(link, {
      current: filter,
      pending: movements.filter((m) => m.isPendingReview).length,
    }),
    lines: lines.map((line) =>
      lineView(line, { ...link, ...(filter ? { filter } : {}) }),
    ),
    ...(kept.length === 0
      ? {}
      : {
          seeAll: {
            label: seeAllLabel(kept.length),
            href: transactionsHref({ ...link, ...(filter ? { filter } : {}) }),
          },
        }),
  };
};
