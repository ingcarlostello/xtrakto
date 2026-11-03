import { categoryKind } from "../categories/category.helpers";
import type { CategoryKind } from "../categories/category.types";
import { moneyDirectionOf } from "../categorization/categorization.helpers";
import { sumAmounts } from "../money/money.helpers";
import type { RecurringPayment } from "../recurring/recurring.types";
import type {
  LineFilter,
  LineNote,
  TranslatableMovement,
  TranslatedLine,
} from "./translated-lines.types";

// How many lines a filter shows (docs/ui/v8-01).
const TRANSLATED_LINES = 5;

const KIND_OF_FILTER = {
  income: "income",
  spending: "spending",
  moved: "internal",
} as const satisfies Record<Exclude<LineFilter, "review">, CategoryKind>;

const kindOf = ({ categoryId }: TranslatableMovement) =>
  categoryId === null ? undefined : categoryKind(categoryId);

/**
 * Whether a filter keeps a movement, as Movimientos's same filter does: a
 * kind's keeps its guesses too. Without a filter, every movement.
 */
export const isInLineFilter = (
  movement: TranslatableMovement,
  filter?: LineFilter,
): boolean => {
  if (filter === undefined) return true;
  if (filter === "review") return movement.isPendingReview;
  return kindOf(movement) === KIND_OF_FILTER[filter];
};

// "Todo" first takes the largest line of each of these, so a period's
// lines explain several things at once (v8-01).
const isSureOf = (m: TranslatableMovement, kind: CategoryKind) =>
  !m.isPendingReview && kindOf(m) === kind;
const VARIETY: readonly ((m: TranslatableMovement) => boolean)[] = [
  (m) => isSureOf(m, "income"),
  (m) => isSureOf(m, "spending"),
  (m) => isSureOf(m, "internal") && m.amountMinor < 0,
  (m) => isSureOf(m, "internal") && m.amountMinor > 0,
  (m) => m.isPendingReview,
];

const size = ({ amountMinor }: TranslatableMovement) => Math.abs(amountMinor);

// A line's movements: one bank text, going one way, with one category.
const textGroups = <T extends TranslatableMovement>(
  movements: readonly T[],
): T[][] => {
  const groups = new Map<string, T[]>();
  for (const movement of movements) {
    const direction = moneyDirectionOf(movement.amountMinor);
    if (direction === undefined) continue;
    const { descriptionRaw, categoryId, isPendingReview } = movement;
    const key = JSON.stringify([
      descriptionRaw,
      direction,
      categoryId,
      isPendingReview,
    ]);
    groups.set(key, [...(groups.get(key) ?? []), movement]);
  }
  return [...groups.values()];
};

// The largest of a group, the earliest of equals.
const largestOf = <T extends TranslatableMovement>(group: readonly T[]): T =>
  group.reduce((largest, m) => (size(m) > size(largest) ? m : largest));

// The fixed payment a line's text is paid by, when it names who by its
// text rather than a number, which a whole text's line doesn't tell apart.
const fixedPaymentOf = (
  { descriptionRaw, categoryId }: TranslatableMovement,
  fixedPayments: readonly RecurringPayment[],
) =>
  fixedPayments.find(
    (payment) =>
      payment.referenceLast4 === null &&
      payment.categoryId === categoryId &&
      payment.bankTexts.includes(descriptionRaw),
  );

const noteOf = (
  group: readonly TranslatableMovement[],
  movement: TranslatableMovement,
  fixedPayments: readonly RecurringPayment[],
): LineNote => {
  const { categoryId, isPendingReview, amountMinor } = movement;
  const kind = kindOf(movement);
  if (isPendingReview && categoryId !== null)
    return { kind: "guess", categoryId };
  const fixed = fixedPaymentOf(movement, fixedPayments);
  if (fixed) return { kind: "fixed", days: fixed.days };
  const direction = moneyDirectionOf(amountMinor);
  if (kind === "internal" && categoryId !== null && direction !== undefined)
    return { kind: "moved", categoryId, direction };
  const others = group.filter((m) => m !== movement);
  const [other] = others;
  if (other === undefined)
    return kind === undefined
      ? { kind: "counts" }
      : { kind: "counts", categoryKind: kind };
  return {
    kind: "sum",
    others: others.length,
    totalMinor: sumAmounts(group.map((m) => m.amountMinor)),
    ...(others.length === 1 ? { otherDate: other.date } : {}),
  };
};

// "Todo": the largest line of each kind first, then the largest of the
// rest, up to five.
const variedLines = <T extends TranslatableMovement>(
  lines: readonly TranslatedLine<T>[],
): TranslatedLine<T>[] => {
  const chosen = new Set<TranslatedLine<T>>();
  for (const isOfSlot of VARIETY) {
    const line = lines.find((l) => !chosen.has(l) && isOfSlot(l.movement));
    if (line) chosen.add(line);
  }
  for (const line of lines) {
    if (chosen.size >= TRANSLATED_LINES) break;
    chosen.add(line);
  }
  return lines.filter((line) => chosen.has(line));
};

/**
 * The lines "Tu extracto, traducido" shows of a period's movements (8.6c):
 * one per bank text, way and category, each its largest movement, with
 * what it means; the largest first, five at most. A filter keeps its five
 * largest; without one, the largest of each kind comes first.
 */
export const translatedLines = <T extends TranslatableMovement>(
  movements: readonly T[],
  {
    filter,
    fixedPayments,
  }: {
    readonly filter?: LineFilter;
    /** Of real spending, found in the year that ends with the period. */
    readonly fixedPayments: readonly RecurringPayment[];
  },
): TranslatedLine<T>[] => {
  const lines = textGroups(movements.filter((m) => isInLineFilter(m, filter)))
    .map((group) => {
      const movement = largestOf(group);
      return { movement, note: noteOf(group, movement, fixedPayments) };
    })
    .sort((a, b) => size(b.movement) - size(a.movement));
  return filter === undefined
    ? variedLines(lines)
    : lines.slice(0, TRANSLATED_LINES);
};
