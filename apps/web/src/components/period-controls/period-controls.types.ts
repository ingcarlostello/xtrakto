import type { CalendarQuarter, CategoryId } from "@xtrakto/core";
import type { AccountRow } from "@xtrakto/db";
import type {
  MovementPeriod,
  PagePeriod,
} from "@/utils/transactions-url.helpers";

/** A quarter to choose from, with what its movements say about it. */
export type QuarterChoice = CalendarQuarter & {
  readonly status: "verified" | "unverified" | "unreconciled";
};

/** A year to choose from, with how many of its months the account has (10.2a). */
export type YearChoice = { readonly year: number; readonly months: number };

type AccountChoices = {
  /** The accounts with movements, the one with the latest first. */
  readonly accounts: readonly AccountRow[];
  readonly account: AccountRow;
  /** Its quarters to choose from, the latest first. */
  readonly quarters: readonly QuarterChoice[];
};

/** What the controls choose among, and what the page shows. */
export type PeriodChoices = AccountChoices & {
  readonly period: MovementPeriod;
};

/** The same for a page whose controls offer a year too (10.2b). */
export type PagePeriodChoices = AccountChoices & {
  /** The years of its quarters, the latest first. */
  readonly years: readonly YearChoice[];
  readonly period: PagePeriod;
};

/** What a page with period controls asks the URL for. */
export type PeriodRequest = {
  readonly accountId?: string;
  readonly period?: MovementPeriod;
};

/** What a page whose controls offer a year asks the URL for (10.2b). */
export type PagePeriodRequest = {
  readonly accountId?: string;
  readonly period?: PagePeriod;
};

/** Where an option leads: an account, a period, or both, of the page. */
export type PeriodLink = {
  /** Left out when the user has a single account. */
  readonly accountId?: string;
  /** Left out to open on the account's latest quarter. */
  readonly period?: PagePeriod;
};

/** A link of a page with period controls, which keeps its own filters. */
export type PeriodHref = {
  readonly pathname:
    | "/"
    | "/transactions"
    | "/recurring"
    | "/categories"
    | `/categories/${CategoryId}`;
  readonly query: Readonly<Record<string, string | number>>;
};

/** The page's link to an account and period, with its own filters. */
export type HrefOf = (link: PeriodLink) => PeriodHref;

export type PeriodOption = {
  readonly key: string;
  readonly label: string;
  readonly href: PeriodHref;
  readonly isCurrent: boolean;
  /** A quarter's status, "Verificado" or "Sin verificar", or a year's months: "10 de 12 meses". */
  readonly badge?: {
    readonly label: string;
    readonly variant: "ok" | "neutral" | "attention" | "info";
  };
};
