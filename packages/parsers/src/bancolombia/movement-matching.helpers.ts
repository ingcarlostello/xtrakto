import {
  addDaysTo,
  type AmountMinor,
  compareLocalDates,
  type LocalDate,
} from "@xtrakto/core";
import { INTEREST_DESCRIPTION } from "./bancolombia.constants";

/** What matching reads of a saved movement. */
export type MatchableMovement = {
  readonly id: string;
  readonly date: LocalDate;
  readonly descriptionNormalized: string;
  readonly amountMinor: AmountMinor;
  /** Its order within its statement: the bank's order within a day. */
  readonly position: number;
};

/** A movements export's movement, and the quarterly statement's that it repeats. */
export type MovementMatch = {
  readonly exportedId: string;
  readonly quarterlyId: string;
};

const isMonthEnd = (date: LocalDate): boolean =>
  addDaysTo(date, 1).endsWith("-01");

// Where the quarterly statement dates a movement the export dates on
// `date`. The export dates interest on the day it was paid, the next one, or
// the same day for a month's last day, which then holds two (Appendix A.2).
const quarterlyDatesOf = ({
  date,
  descriptionNormalized,
}: MatchableMovement): readonly LocalDate[] => {
  if (descriptionNormalized !== INTEREST_DESCRIPTION) return [date];
  const dayBefore = addDaysTo(date, -1);
  return isMonthEnd(date) ? [dayBefore, date] : [dayBefore];
};

// A letter outside plain ASCII at the end, such as an accented one.
const LAST_ACCENTED_LETTER = /[^ -~]$/u;

// The quarterly statement can cut a description just before an accented
// letter the export keeps: "COMIDAS R" for "COMIDAS RÁ" (Appendix A.2).
const isSameText = (quarterly: string, exported: string): boolean => {
  const printed = quarterly.normalize("NFC");
  const written = exported.normalize("NFC");
  return (
    printed === written || printed === written.replace(LAST_ACCENTED_LETTER, "")
  );
};

// Days in order, then the bank's order within a day.
const inDayOrder = (a: MatchableMovement, b: MatchableMovement): number =>
  compareLocalDates(a.date, b.date) || a.position - b.position;

const keyOf = (date: LocalDate, amount: AmountMinor): string =>
  `${date} ${amount}`;

// The quarterly statement's movements not yet taken, by day and amount.
const waitingByKey = (
  quarterly: readonly MatchableMovement[],
): Map<string, MatchableMovement[]> => {
  const waiting = new Map<string, MatchableMovement[]>();
  for (const movement of [...quarterly].sort(inDayOrder)) {
    const key = keyOf(movement.date, movement.amountMinor);
    const same = waiting.get(key) ?? [];
    same.push(movement);
    waiting.set(key, same);
  }
  return waiting;
};

// Takes the first statement movement, in the bank's order, that an exported
// one repeats, trying each day the statement may date it.
const takeTwin = (
  waiting: Map<string, MatchableMovement[]>,
  exported: MatchableMovement,
): MatchableMovement | undefined => {
  for (const date of quarterlyDatesOf(exported)) {
    const candidates = waiting.get(keyOf(date, exported.amountMinor)) ?? [];
    const index = candidates.findIndex((candidate) =>
      isSameText(
        candidate.descriptionNormalized,
        exported.descriptionNormalized,
      ),
    );
    if (index >= 0) return candidates.splice(index, 1)[0];
  }
  return undefined;
};

/**
 * Pairs a movements export's movements with the verified quarterly
 * statement's that they repeat, on the days the statement covers: the same
 * amount, the same text or one the statement cut, and the day the statement
 * gives it. Each statement movement repeats one exported movement at most,
 * in the bank's order among equal ones.
 */
export const matchMovements = (
  quarterly: readonly MatchableMovement[],
  exported: readonly MatchableMovement[],
): MovementMatch[] => {
  const waiting = waitingByKey(quarterly);
  return [...exported].sort(inDayOrder).flatMap((movement) => {
    const twin = takeTwin(waiting, movement);
    return twin === undefined
      ? []
      : [{ exportedId: movement.id, quarterlyId: twin.id }];
  });
};
