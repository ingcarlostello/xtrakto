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
import {
  accountShortLabel,
  isCard,
  isOtherBank,
} from "@/utils/account-label.helpers";
import { joined } from "@/utils/list-text.utils";
import { coverageSentence, overlapNote } from "./coverage-sentence.helpers";
import { COVERAGE_COPY, TIMELINE_MONTHS } from "./coverage-timeline.constants";
import type {
  CoverageSegment,
  CoverageSource,
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
 * those a verified quarterly statement covers, those movements files saved
 * movements in, and those a card's statement that reconciles closes in
 * (12.3b, 12.3c).
 */
export const monthsHad = ({
  months,
  quarters,
  cardStatements,
}: AccountCoverage): ReadonlySet<string> =>
  new Set([
    ...verifiedMonths(quarters),
    ...months
      .filter(({ files }) => files.some(({ isQuarterly }) => !isQuarterly))
      .map(({ month }) => month),
    ...cardStatements.map(({ to }) => to.slice(0, 7)),
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
): Omit<CoverageView, "accountLabel" | "verifiedBy"> => {
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
 * A card's coverage as its timeline shows it (12.3b): its months are those
 * its statements close in, as its bank titles them, verified when one that
 * reconciles closes in it and missing otherwise, through `today`'s month.
 * The purchases a statement lists from earlier months don't reach back.
 */
export const cardCoverageViewOf = (
  { accountId, cardStatements }: AccountCoverage,
  today: LocalDate,
): Omit<CoverageView, "accountLabel" | "verifiedBy"> => {
  const verified = new Set(cardStatements.map(({ to }) => to.slice(0, 7)));
  const segments = timelineMonths([...verified].sort(), today).map(
    (month): CoverageSegment => ({
      month,
      label: formatShortMonth(month),
      status: verified.has(monthKey(month)) ? "verified" : "missing",
      isAlsoInMovements: false,
    }),
  );
  return {
    accountId,
    segments,
    sentence: coverageSentence(segments, monthOfKey(today)),
    isChained: false,
  };
};

const sourceOf = (account: AccountRow): CoverageSource => {
  if (isCard(account)) return "card";
  return isOtherBank(account.bankId) ? "balances" : "quarterly";
};

// Whether an account has anything its timeline draws.
const hasMonths = (account: AccountRow, found: AccountCoverage): boolean =>
  isCard(account)
    ? found.cardStatements.length > 0
    : found.months.length > 0 || found.quarters.length > 0;

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
    return found && hasMonths(account, found) ? [{ account, found }] : [];
  });
  return shown.map(({ account, found }) => ({
    ...(isCard(account)
      ? cardCoverageViewOf(found, today)
      : coverageViewOf(found, today)),
    verifiedBy: sourceOf(account),
    ...(shown.length > 1
      ? { accountLabel: accountShortLabel(account, account.last4) }
      : {}),
  }));
};

// The legend's order of what verifies a month.
const SOURCES: readonly CoverageSource[] = ["quarterly", "balances", "card"];

/**
 * What verified a month, as the legend says it for the accounts shown: a
 * quarterly statement, another bank's spreadsheet with balances (11.3c), a
 * card's statement (12.3b), or several: "Extracto trimestral o extracto de
 * tu tarjeta, verificado".
 */
export const verifiedLegend = (
  views: readonly Pick<CoverageView, "verifiedBy">[],
): string => {
  const { legend } = COVERAGE_COPY;
  const shown = SOURCES.filter((source) =>
    views.some(({ verifiedBy }) => verifiedBy === source),
  );
  const sources = joined(
    (shown.length > 0 ? shown : SOURCES.slice(0, 1)).map(
      (source) => legend.verifiedBy[source],
    ),
    legend.or,
  );
  return `${sources.charAt(0).toUpperCase()}${sources.slice(1)}, ${legend.verified}`;
};
