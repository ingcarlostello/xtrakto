import { compareLocalDates } from "@xtrakto/core";
import type { AmountMinor, ParsedTransaction } from "@xtrakto/core";

type Movement = ParsedTransaction;

type BalanceTrail = {
  /** Every printed balance is the one before plus its amount. */
  readonly holds: boolean;
  /** The balance after the last movement, when it's known. */
  readonly balance: number | undefined;
};

// Follows the balances of some movements from `opening`. A movement without
// a balance carries the one before it.
const followBalances = (
  movements: readonly Movement[],
  opening: number | undefined,
): BalanceTrail => {
  let balance = opening;
  let holds = true;
  for (const { amountMinor, balanceAfterMinor } of movements) {
    const expected = balance === undefined ? undefined : balance + amountMinor;
    const breaks =
      expected !== undefined &&
      balanceAfterMinor !== undefined &&
      expected !== balanceAfterMinor;
    holds &&= !breaks;
    balance = balanceAfterMinor ?? expected;
  }
  return { holds, balance };
};

// Consecutive movements of the same day, in their order.
const daysOf = (movements: readonly Movement[]): Movement[][] => {
  const days: Movement[][] = [];
  for (const movement of movements) {
    const day = days.at(-1);
    if (day?.[0]?.date === movement.date) day.push(movement);
    else days.push([movement]);
  }
  return days;
};

// Each day in the order its balances chain: turned around when they chain
// only that way.
const chainedDays = (
  movements: readonly Movement[],
  opening: number | undefined,
): Movement[] => {
  const ordered: Movement[] = [];
  let balance = opening;
  for (const day of daysOf(movements)) {
    const turned = day.toReversed();
    const isTurned =
      !followBalances(day, balance).holds &&
      followBalances(turned, balance).holds;
    const inOrder = isTurned ? turned : day;
    ordered.push(...inOrder);
    balance = followBalances(inOrder, balance).balance;
  }
  return ordered;
};

/**
 * A mapped file's movements, oldest first. A file whose last movement is
 * older than its first lists them newest first, and reads bottom-up; within
 * a day, a file's balances decide, turning a day whose balances chain only
 * the other way around. `opening` is the balance before the first movement,
 * when the file prints it.
 */
export const inDateOrder = (
  movements: readonly Movement[],
  opening?: AmountMinor,
): Movement[] => {
  const first = movements[0];
  const last = movements.at(-1);
  const isNewestFirst =
    first !== undefined &&
    last !== undefined &&
    compareLocalDates(first.date, last.date) > 0;
  const fileOrder = isNewestFirst ? movements.toReversed() : [...movements];
  const byDate = fileOrder.toSorted((a, b) =>
    compareLocalDates(a.date, b.date),
  );
  return chainedDays(byDate, opening);
};
