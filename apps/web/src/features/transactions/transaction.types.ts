import type { AmountMinor, LocalDate } from "@xtrakto/core";
import type {
  AccountRow,
  MovementQuarter,
  TransactionListItem,
} from "@xtrakto/db";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";

/** What the URL asks the movements list for. */
export type TransactionsRequest = {
  readonly accountId?: string;
  readonly period?: MovementPeriod;
  /** What to look for among the period's movements, as typed. */
  readonly search?: string;
  readonly shown: number;
};

/** An account's movements in a period, as the list reads them. */
export type AccountTransactions = {
  /** The accounts with movements, the one with the latest first. */
  readonly accounts: readonly AccountRow[];
  readonly account: AccountRow;
  /** Its quarters with movements, the latest first. */
  readonly quarters: readonly MovementQuarter[];
  readonly period: MovementPeriod;
  /** What the list looks for, as typed. */
  readonly search?: string;
  /** Every movement of the account in the period that counts and matches. */
  readonly total: number;
  /** The newest of them, as many as the list shows. */
  readonly items: readonly TransactionListItem[];
  /** This year in Bogotá, which day headings leave out. */
  readonly currentYear: string;
};

/** A day of the list: its movements and, when printed, its closing balance. */
export type TransactionDay = {
  readonly date: LocalDate;
  readonly balanceMinor: AmountMinor | null;
  readonly items: readonly TransactionListItem[];
};

/** A movement's line: the bank's text as printed, or that it gave none. */
export type DescriptionView =
  | { readonly kind: "bank"; readonly text: string }
  | { readonly kind: "none"; readonly raw: string };

/** A link to the list with other filters. */
export type TransactionsHref = {
  readonly pathname: "/transactions";
  readonly query: Readonly<Record<string, string | number>>;
};

/** The list's next step: its link's label and where it goes. */
export type NextStep = {
  readonly label: string;
  readonly href: TransactionsHref;
};

/** An option of the period selector or the account switch. */
export type PeriodOption = {
  readonly key: string;
  readonly label: string;
  readonly href: TransactionsHref;
  readonly isCurrent: boolean;
  /** A quarter's status: "Verificado" or "Sin verificar". */
  readonly badge?: { readonly label: string; readonly isOk: boolean };
};
