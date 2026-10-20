import type { CalendarQuarter } from "@xtrakto/core";
import type { AccountRow } from "@xtrakto/db";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";

/** A quarter to choose from, with what its movements say about it. */
export type QuarterChoice = CalendarQuarter & {
  readonly status: "verified" | "unverified" | "unreconciled";
};

/** What the controls choose among, and what the page shows. */
export type PeriodChoices = {
  /** The accounts with movements, the one with the latest first. */
  readonly accounts: readonly AccountRow[];
  readonly account: AccountRow;
  /** Its quarters to choose from, the latest first. */
  readonly quarters: readonly QuarterChoice[];
  readonly period: MovementPeriod;
};

/** What a page with period controls asks the URL for. */
export type PeriodRequest = {
  readonly accountId?: string;
  readonly period?: MovementPeriod;
};

/** Where an option leads: an account, a period, or both, of the page. */
export type PeriodLink = {
  /** Left out when the user has a single account. */
  readonly accountId?: string;
  /** Left out to open on the account's latest quarter. */
  readonly period?: MovementPeriod;
};

/** A link of a page with period controls, which keeps its own filters. */
export type PeriodHref = {
  readonly pathname: "/" | "/transactions" | "/recurring";
  readonly query: Readonly<Record<string, string | number>>;
};

/** The page's link to an account and period, with its own filters. */
export type HrefOf = (link: PeriodLink) => PeriodHref;

export type PeriodOption = {
  readonly key: string;
  readonly label: string;
  readonly href: PeriodHref;
  readonly isCurrent: boolean;
  /** A quarter's status: "Verificado" or "Sin verificar". */
  readonly badge?: {
    readonly label: string;
    readonly variant: "ok" | "neutral" | "attention";
  };
};
