import { compareLocalDates } from "../dates/date.helpers";
import type { LocalDate } from "../dates/date.types";
import { isAmountMinor } from "../money/money.helpers";
import type { AmountMinor } from "../money/money.types";
import type { BalanceMovement, DayBalance } from "../summary/summary.types";
import type { ReportedBalanceCheck, DatedBalance } from "./balance-check.types";

type DatedAmount = Pick<BalanceMovement, "date" | "amountMinor">;

// What each day's movements add up to, the oldest day first.
const dayTotals = (
  movements: readonly DatedAmount[],
): [LocalDate, number][] => {
  const totals = new Map<LocalDate, number>();
  for (const { date, amountMinor } of movements)
    totals.set(date, (totals.get(date) ?? 0) + amountMinor);
  return [...totals].sort(([a], [b]) => compareLocalDates(a, b));
};

// Each day's balance from an opening one; `undefined` past the safe integers.
const dayBalancesFrom = (
  opening: AmountMinor,
  movements: readonly DatedAmount[],
): DayBalance[] | undefined => {
  const days: DayBalance[] = [];
  let openingMinor = opening;
  for (const [date, total] of dayTotals(movements)) {
    const closingMinor = openingMinor + total;
    if (!isAmountMinor(closingMinor)) return undefined;
    days.push({ date, openingMinor, closingMinor });
    openingMinor = closingMinor;
  }
  return days;
};

/**
 * Whether the balance a person typed adds up (10.3): the latest verified
 * closing balance plus the movements that count since it, through the day
 * typed. `undefined` with nothing to compare it with: no verified closing
 * before that day, or a quarterly statement that came later and covers it,
 * whose own balances speak for those days.
 */
export const checkReportedBalance = (
  reported: DatedBalance,
  closing: DatedBalance | undefined,
  movements: readonly DatedAmount[],
): ReportedBalanceCheck | undefined => {
  if (closing === undefined || closing.date >= reported.date) return undefined;
  const days = dayBalancesFrom(
    closing.amountMinor,
    movements.filter(
      ({ date }) => date > closing.date && date <= reported.date,
    ),
  );
  if (days === undefined) return undefined;
  const added = days.at(-1)?.closingMinor ?? closing.amountMinor;
  const differenceMinor = reported.amountMinor - added;
  if (!isAmountMinor(differenceMinor)) return undefined;
  const closingDate = closing.date;
  return differenceMinor === 0
    ? { status: "adds_up", reported, closingDate, days }
    : { status: "off", reported, closingDate, differenceMinor };
};

/**
 * Movements with the balance a check that added up worked out for them,
 * each day from its opening in the order they come (the oldest first, as
 * `dailyBalances` reads them); those of other days, and those of a check
 * that didn't add up, stay as they are.
 */
export const withCheckedBalances = <T extends BalanceMovement>(
  movements: readonly T[],
  check: ReportedBalanceCheck | undefined,
): readonly T[] => {
  if (check?.status !== "adds_up") return movements;
  const days = new Map(check.days.map((day) => [day.date, day]));
  const running = new Map<LocalDate, number>();
  return movements.map((movement) => {
    const day = days.get(movement.date);
    if (!day || movement.balanceAfterMinor !== null) return movement;
    const balance =
      (running.get(movement.date) ?? day.openingMinor) + movement.amountMinor;
    running.set(movement.date, balance);
    return isAmountMinor(balance)
      ? { ...movement, balanceAfterMinor: balance }
      : movement;
  });
};
