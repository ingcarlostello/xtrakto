import {
  type AmountMinor,
  type CategoryKind,
  categoryKind,
  CURRENCY,
  formatCompactAmount,
  isAmountMinor,
  type KindTotals,
} from "@xtrakto/core";
import { countText, formatCount, wordFor } from "@/utils/count-text.utils";
import { pendingOf } from "./review-display.helpers";
import { REVIEW_ANSWERS, REVIEW_COPY as COPY } from "./review.constants";
import { reviewGroupById } from "./review.helpers";
import type {
  KindShare,
  PendingMovements,
  Review,
  ReviewGroupDefinition,
  ReviewGroupId,
} from "./review.types";

/** An open group as "Lo que está en juego" shows it (docs/ui/v8-02). */
export type StakeView = {
  readonly id: ReviewGroupId;
  readonly name: string;
  /** What waits in it, compact and without its direction: "$6,0M". */
  readonly amount: string;
  /** "Hoy cuentan como movido. Si son compras, tu gasto real sube a $30,4M." */
  readonly explanation: string;
};

/** "Lo que está en juego": how far the review went, and each open group. */
export type StakesView = {
  readonly subtitle: string;
  /** "2 de 6 respondidos". */
  readonly progress: string;
  /** "24 movimientos pendientes", while any waits. */
  readonly waiting: string | null;
  /** The share of groups answered, from 0 to 100, which its bar draws. */
  readonly answeredPercent: number;
  readonly groups: readonly StakeView[];
};

type Change = {
  readonly kinds: readonly KindShare[];
  readonly to: CategoryKind;
};

// What a kind's total would add up to if these movements counted as `to`:
// they join it, leave it, or don't touch it.
const totalIf = (
  total: AmountMinor,
  kind: CategoryKind,
  { kinds, to }: Change,
): number =>
  kinds.reduce<number>((sum, share) => {
    if (share.kind === to) return sum;
    if (kind === to) return sum + share.amountMinor;
    return share.kind === kind ? sum - share.amountMinor : sum;
  }, total);

// "tu gasto real sube a $30,4M", from what a total is and would be as the
// user reads it; none when it stays.
const changeText = (
  { up, down }: { readonly up: string; readonly down: string },
  [now, then]: readonly [number, number],
): string | null =>
  then === now || !isAmountMinor(then)
    ? null
    : `${then > now ? up : down} ${formatCompactAmount(then, CURRENCY.COP)}`;

// "Si son compras, tu gasto real sube a $30,4M.": what the group's other
// answer would make the quarter's real spending, which goes out, or else its
// income; none when it changes neither.
const whatIfText = (
  { whatIf }: ReviewGroupDefinition,
  kinds: readonly KindShare[],
  { spending, income }: KindTotals,
): string | null => {
  const { categoryId } = REVIEW_ANSWERS[whatIf.answer];
  const to = categoryId === null ? undefined : categoryKind(categoryId);
  if (to === undefined) return null;
  const change =
    changeText(COPY.spendingTo, [
      -spending.amountMinor,
      -totalIf(spending.amountMinor, "spending", { kinds, to }),
    ]) ??
    changeText(COPY.incomeTo, [
      income.amountMinor,
      totalIf(income.amountMinor, "income", { kinds, to }),
    ]);
  return change === null ? null : `${whatIf.ifSaid}, ${change}.`;
};

// "Hoy cuentan como movido.", by what most of them count as.
const todayText = ({ kinds, count }: PendingMovements): string | null => {
  const [most] = kinds;
  return most === undefined
    ? null
    : `${COPY.today} ${wordFor(count, COPY.counts)} ${COPY.kinds[most.kind]}.`;
};

// What some movements add up to, without their direction: "$6,0M".
const amountAtStake = (amount: AmountMinor): string => {
  const magnitude = Math.abs(amount);
  return formatCompactAmount(
    isAmountMinor(magnitude) ? magnitude : amount,
    CURRENCY.COP,
  );
};

const stakeOf = (
  id: ReviewGroupId,
  pending: PendingMovements,
  totals: KindTotals,
): StakeView => {
  const definition = reviewGroupById(id);
  return {
    id,
    name: definition.name,
    amount: amountAtStake(pending.amountMinor),
    explanation: [
      todayText(pending),
      whatIfText(definition, pending.kinds, totals),
    ]
      .filter((sentence) => sentence !== null)
      .join(" "),
  };
};

/**
 * "Lo que está en juego" of a quarter's review (docs/ui/v8-02): how many of
 * its groups are answered and how many movements wait, then each open group
 * with its amount, what it counts as today and what its other answer would
 * make the quarter's totals, each on its own.
 */
export const stakesView = ({
  groups,
  totals,
}: Pick<Review, "groups" | "totals">): StakesView => {
  const pending = pendingOf(groups);
  const answered = groups.length - pending.groups;
  return {
    subtitle:
      pending.groups > 0 ? COPY.stakesWhileOpen : COPY.stakesAllAnswered,
    progress: `${formatCount(answered)} ${COPY.of} ${countText(groups.length, COPY.answered)}`,
    waiting:
      pending.movements > 0 ? countText(pending.movements, COPY.waiting) : null,
    answeredPercent:
      groups.length === 0 ? 0 : Math.round((answered / groups.length) * 100),
    groups: groups.flatMap(({ id, pending: waiting }) =>
      waiting === null ? [] : [stakeOf(id, waiting, totals)],
    ),
  };
};
