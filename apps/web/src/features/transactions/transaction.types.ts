import type { AmountMinor, CalendarQuarter, LocalDate } from "@xtrakto/core";
import type {
  AccountRow,
  TransactionListItem,
  UnreconciledStatement,
} from "@xtrakto/db";
import type {
  MovementFilter,
  MovementPeriod,
} from "@/utils/transactions-url.helpers";

/** A quarter to choose from, with what its movements say about it. */
export type QuarterChoice = CalendarQuarter & {
  readonly status: "verified" | "unverified" | "unreconciled";
};

/** What the URL asks the movements list for. */
export type TransactionsRequest = {
  readonly accountId?: string;
  readonly period?: MovementPeriod;
  /** What to look for among the period's movements, as typed. */
  readonly search?: string;
  /** Which of them to show: a kind, or those to review. */
  readonly filter?: MovementFilter;
  readonly shown: number;
};

/** An account's movements in a period, as the list reads them. */
export type AccountTransactions = {
  /** The accounts with movements, the one with the latest first. */
  readonly accounts: readonly AccountRow[];
  readonly account: AccountRow;
  /** Its quarters to choose from, the latest first. */
  readonly quarters: readonly QuarterChoice[];
  /** Its statements that don't reconcile on the period's days. */
  readonly unreconciled: readonly UnreconciledStatement[];
  readonly period: MovementPeriod;
  /** What the list looks for, as typed. */
  readonly search?: string;
  readonly filter?: MovementFilter;
  /** The period's movements that count, by kind, whatever the list shows. */
  readonly kindTotals: KindTotals;
  /** How many of the period's movements wait for review. */
  readonly pendingReview: number;
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

/** Why a row stands out: where a statement's balance breaks. */
export type MovementMark = {
  readonly note: string;
  /** The first one's id, for "Ir a la primera fila que no cuadra". */
  readonly anchor?: string;
};

/**
 * The tags under a movement: how its money moved, and its category or that
 * the category is only a guess waiting for review.
 */
export type MovementTags = {
  readonly channel: string | undefined;
  readonly category: string | undefined;
  readonly isPendingReview: boolean;
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
  readonly badge?: {
    readonly label: string;
    readonly variant: "ok" | "neutral" | "attention";
  };
};

/** Some movements of a kind: their amounts added up, and how many. */
export type KindTotal = {
  readonly amountMinor: AmountMinor;
  readonly count: number;
};

/** A period's movements that count, by kind (design-system.md §3.4). */
export type KindTotals = {
  readonly income: KindTotal;
  readonly spending: KindTotal;
  /** Money that only moved goes both ways: out, and back. */
  readonly moved: { readonly out: KindTotal; readonly back: KindTotal };
};

/**
 * The colors a movement shows: its kind's, or neutral while it waits for
 * review, has no category or counts nowhere.
 */
export type MovementTone = "income" | "spending" | "moved" | "neutral";

/** A kind's tile on Movimientos (docs/ui/v8-03). */
export type KindTile = {
  readonly tone: Exclude<MovementTone, "neutral">;
  readonly label: string;
  /** `["+$46,8M"]`, or both ways for money that moved: `["−$29,8M", "+$2,8M"]`. */
  readonly totals: readonly string[];
  /** `"41 movimientos"`, or `"57 salieron · 8 volvieron"`. */
  readonly detail: string;
};

/** A filter chip: what it shows and its link; the current one is marked. */
export type FilterOption = {
  readonly label: string;
  readonly href: TransactionsHref;
  readonly isCurrent: boolean;
};
