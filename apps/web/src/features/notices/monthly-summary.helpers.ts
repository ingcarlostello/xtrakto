import type { CalendarMonth, LocalDate } from "@xtrakto/core";
import type { AccountCoverage } from "@xtrakto/db";
import {
  hasWholeMonth,
  monthAtIndex,
  monthIndex,
  monthKey,
  monthOfKey,
  monthsHad,
} from "@/components/coverage-timeline/coverage-timeline.helpers";

/** What the month that ended is for a person, as their email says it. */
export type MonthlyStatus =
  /** An account has it through its last day: its summary is ready. */
  | { readonly kind: "ready"; readonly accountId: string }
  /** It has movements, but no account reaches its last day. */
  | { readonly kind: "partial" }
  /** No account has a movement of it. */
  | { readonly kind: "missing" };

/** The month before `today`'s, the one that ended on the first of a month. */
export const monthThatEnded = (today: LocalDate): CalendarMonth =>
  monthAtIndex(monthIndex(monthOfKey(today)) - 1);

/** What a month is for someone with these accounts. */
export const monthlyStatusOf = (
  accounts: readonly AccountCoverage[],
  month: CalendarMonth,
): MonthlyStatus => {
  const whole = accounts.find((account) => hasWholeMonth(account, month));
  if (whole) return { kind: "ready", accountId: whole.accountId };
  const key = monthKey(month);
  return accounts.some((account) => monthsHad(account).has(key))
    ? { kind: "partial" }
    : { kind: "missing" };
};
