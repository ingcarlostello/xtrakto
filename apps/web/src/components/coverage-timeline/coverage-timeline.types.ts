import type { CalendarMonth } from "@xtrakto/core";

/** What a month of an account holds (design-system.md §9, coverage timeline). */
export type CoverageStatus = "verified" | "unverified" | "missing";

/** A month as the coverage timeline draws it. */
export type CoverageSegment = {
  readonly month: CalendarMonth;
  /** `"ago"`. */
  readonly label: string;
  readonly status: CoverageStatus;
  /** A verified month that movements files brought too (10.1a). */
  readonly isAlsoInMovements: boolean;
};

/** An account's coverage, as the upload screen and the profile show it (10.2a). */
export type CoverageView = {
  readonly accountId: string;
  /** Its short label, when the user has several accounts with months. */
  readonly accountLabel?: string;
  readonly segments: readonly CoverageSegment[];
  /** What the segments show, in words. */
  readonly sentence: string;
  /** Two or more verified quarterly statements in its months, each chained on to the one before. */
  readonly isChained: boolean;
  /** The latest month several overlapping movements files brought. */
  readonly note?: string;
};
