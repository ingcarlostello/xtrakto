import { channelOf } from "../categorization/channel.helpers";
import { compareLocalDates } from "../dates/date.helpers";
import {
  isNumberPayee,
  movementsByPayee,
  payeeLabelOf,
} from "../recurring/recurring-payee.helpers";
import { recurringPaymentTitle } from "../recurring/recurring-title.helpers";
import type { RecurringMovement } from "../recurring/recurring.types";
import { totalOfMovements } from "../summary/summary.helpers";
import { foldText } from "../text/text.utils";
import type { Place } from "./places.types";

type Group = {
  readonly payee: string;
  readonly movements: readonly RecurringMovement[];
};

// The movements whose text names no one, by name or number, by their
// whole text: "TRANSFERENCIAS A NEQUI" without its number.
const byWholeText = (movements: readonly RecurringMovement[]): Group[] => {
  const groups = new Map<string, RecurringMovement[]>();
  for (const movement of movements) {
    const text = foldText(movement.descriptionRaw);
    groups.set(text, [...(groups.get(text) ?? []), movement]);
  }
  return [...groups].map(([payee, group]) => ({
    payee,
    movements: [...group].sort((a, b) => compareLocalDates(a.date, b.date)),
  }));
};

// The ways the bank wrote a place, the most used first, then the latest.
const bankTextsOf = (movements: readonly RecurringMovement[]): string[] => {
  const seen = new Map<string, { count: number; last: number }>();
  movements.forEach(({ descriptionRaw }, index) => {
    const count = (seen.get(descriptionRaw)?.count ?? 0) + 1;
    seen.set(descriptionRaw, { count, last: index });
  });
  return [...seen]
    .sort(([, a], [, b]) => b.count - a.count || b.last - a.last)
    .map(([text]) => text);
};

// Who a group paid, as the bank last wrote it.
const titleOf = ({ payee, movements }: Group, isNamed: boolean): string => {
  const latest = movements.at(-1);
  if (latest === undefined) return payee;
  if (!isNamed) return latest.descriptionRaw.trim();
  if (!isNumberPayee(payee)) return payeeLabelOf(latest.descriptionRaw);
  const channel = channelOf(latest.descriptionRaw);
  return recurringPaymentTitle({
    label: latest.descriptionRaw.trim(),
    referenceLast4: latest.referenceLast4,
    channels: channel === null ? [] : [channel.id],
  });
};

const placeOf = (group: Group, isNamed: boolean): Place => ({
  title: titleOf(group, isNamed),
  bankTexts: bankTextsOf(group.movements),
  total: totalOfMovements(group.movements),
});

/**
 * Where some movements' money went (docs/ui/v8-06, "Dónde más"): by who
 * was paid, however the bank cut the name, as Pagos fijos joins them; by
 * the number paid when the text names no one; or by the whole text when
 * neither says. The most money first, then the most movements.
 */
export const placesOf = (movements: readonly RecurringMovement[]): Place[] => {
  const named = movementsByPayee(movements);
  const grouped = new Set(named.flatMap((group) => group.movements));
  const unnamed = byWholeText(movements.filter((m) => !grouped.has(m)));
  return [
    ...named.map((group) => placeOf(group, true)),
    ...unnamed.map((group) => placeOf(group, false)),
  ].sort(
    (a, b) =>
      Math.abs(b.total.amountMinor) - Math.abs(a.total.amountMinor) ||
      b.total.count - a.total.count ||
      a.title.localeCompare(b.title, "es"),
  );
};
