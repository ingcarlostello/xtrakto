import {
  addDaysTo,
  type CalendarMonth,
  formatShortMonth,
  type LocalDate,
  monthPeriod,
} from "@xtrakto/core";
import type {
  AccountCoverage,
  AccountRow,
  CoverageMonth,
  CoverageQuarter,
} from "@xtrakto/db";
import { accountShortLabel } from "@/utils/account-label.helpers";
import { coverageSentence, overlapNote } from "./coverage-sentence.helpers";
import { TIMELINE_MONTHS } from "./coverage-timeline.constants";
import type {
  CoverageSegment,
  CoverageStatus,
  CoverageView,
} from "./coverage-timeline.types";

const MONTHS_A_YEAR = 12;

/** A month as a count of months, so ranges are plain arithmetic. */
export const monthIndex = ({ year, month }: CalendarMonth): number =>
  year * MONTHS_A_YEAR + month - 1;

export const monthAtIndex = (index: number): CalendarMonth => ({
  year: Math.floor(index / MONTHS_A_YEAR),
  month: (index % MONTHS_A_YEAR) + 1,
});

/** The month of a key or a day: `"2026-08"`, `"2026-08-15"`. */
export const monthOfKey = (key: string): CalendarMonth => ({
  year: Number(key.slice(0, 4)),
  month: Number(key.slice(5, 7)),
});

/** `"2026-08"`. */
export const monthKey = ({ year, month }: CalendarMonth): string =>
  `${year}-${String(month).padStart(2, "0")}`;

/**
 * The months an account's timeline shows, from the months it has
 * (`"2026-08"`, in order): from its first through this one, or a later one
 * it has, twelve at most.
 */
export const timelineMonths = (
  known: readonly string[],
  today: LocalDate,
): CalendarMonth[] => {
  const [first] = known;
  if (first === undefined) return [];
  const latest = monthIndex(monthOfKey(known.at(-1) ?? first));
  const last = Math.max(monthIndex(monthOfKey(today)), latest);
  const start = Math.max(
    monthIndex(monthOfKey(first)),
    last - TIMELINE_MONTHS + 1,
  );
  return Array.from({ length: last - start + 1 }, (_, i) =>
    monthAtIndex(start + i),
  );
};

// The months verified quarterly statements cover: those of their days, after
// the opening balance's day through the closing balance's (ADR 0018).
const verifiedMonths = (quarters: readonly CoverageQuarter[]): Set<string> =>
  new Set(
    quarters.flatMap(({ period }) => {
      const start = monthIndex(monthOfKey(addDaysTo(period.from, 1)));
      const end = monthIndex(monthOfKey(period.to));
      return Array.from({ length: end - start + 1 }, (_, i) =>
        monthKey(monthAtIndex(start + i)),
      );
    }),
  );

/**
 * The months an account has, as its timeline counts them (`"2026-08"`):
 * those a verified quarterly statement covers, and those movements files
 * saved movements in.
 */
export const monthsHad = ({
  months,
  quarters,
}: AccountCoverage): ReadonlySet<string> =>
  new Set([
    ...verifiedMonths(quarters),
    ...months
      .filter(({ files }) => files.some(({ isQuarterly }) => !isQuarterly))
      .map(({ month }) => month),
  ]);

/**
 * Whether an account has a month through its last day (10.5): a verified
 * quarterly statement covers it, or a movements file reaches that day.
 */
export const hasWholeMonth = (
  { months, quarters }: AccountCoverage,
  month: CalendarMonth,
): boolean => {
  const key = monthKey(month);
  if (verifiedMonths(quarters).has(key)) return true;
  const { to } = monthPeriod(month);
  return (
    months
      .find((saved) => saved.month === key)
      ?.files.some(
        ({ isQuarterly, period }) => !isQuarterly && period.to >= to,
      ) ?? false
  );
};

// A month a verified quarterly statement covers, else one only movements
// files brought, else one the user doesn't have.
const statusOf = (
  isVerified: boolean,
  month: CoverageMonth | undefined,
): CoverageStatus => {
  if (isVerified) return "verified";
  return month?.files.some(({ isQuarterly }) => !isQuarterly)
    ? "unverified"
    : "missing";
};

const segmentOf = (
  month: CalendarMonth,
  {
    months,
    verified,
  }: { months: readonly CoverageMonth[]; verified: Set<string> },
): CoverageSegment => {
  const key = monthKey(month);
  const saved = months.find((m) => m.month === key);
  const status = statusOf(verified.has(key), saved);
  return {
    month,
    label: formatShortMonth(month),
    status,
    isAlsoInMovements:
      status === "verified" &&
      (saved?.files.some(({ isQuarterly }) => !isQuarterly) ?? false),
  };
};

// Two or more verified quarterly statements end in the timeline's months,
// and each after the first chains on to the one before it.
const isChainedIn = (
  { quarters }: AccountCoverage,
  shown: readonly CalendarMonth[],
): boolean => {
  const keys = new Set(shown.map(monthKey));
  const within = quarters.filter(({ period }) =>
    keys.has(period.to.slice(0, 7)),
  );
  return within.length > 1 && within.slice(1).every((q) => q.isChained);
};

/** An account's coverage as its timeline shows it, through `today`'s month (10.2a). */
export const coverageViewOf = (
  coverage: AccountCoverage,
  today: LocalDate,
): Omit<CoverageView, "accountLabel"> => {
  const verified = verifiedMonths(coverage.quarters);
  const known = [
    ...new Set([...coverage.months.map(({ month }) => month), ...verified]),
  ].sort();
  const shown = timelineMonths(known, today);
  const keys = new Set(shown.map(monthKey));
  const current = monthOfKey(today);
  const segments = shown.map((month) =>
    segmentOf(month, { months: coverage.months, verified }),
  );
  const note = overlapNote(
    coverage.months.filter(({ month }) => keys.has(month)),
    current,
  );
  return {
    accountId: coverage.accountId,
    segments,
    sentence: coverageSentence(segments, current),
    isChained: isChainedIn(coverage, shown),
    ...(note === undefined ? {} : { note }),
  };
};

/**
 * The user's accounts with months, in the order of `accounts`, each named by
 * its short label when there are several (decided with the human).
 */
export const coverageViews = (
  coverage: readonly AccountCoverage[],
  accounts: readonly AccountRow[],
  today: LocalDate,
): CoverageView[] => {
  const shown = accounts.flatMap((account) => {
    const found = coverage.find(({ accountId }) => accountId === account.id);
    return found && (found.months.length > 0 || found.quarters.length > 0)
      ? [{ account, found }]
      : [];
  });
  return shown.map(({ account, found }) => ({
    ...coverageViewOf(found, today),
    ...(shown.length > 1
      ? { accountLabel: accountShortLabel(account, account.last4) }
      : {}),
  }));
};
