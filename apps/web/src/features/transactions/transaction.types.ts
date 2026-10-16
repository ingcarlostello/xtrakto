import type { AmountMinor, LocalDate } from "@xtrakto/core";
import type { AccountRow, TransactionListItem } from "@xtrakto/db";

/** An account's movements as the list reads them. */
export type AccountTransactions = {
  readonly account: AccountRow;
  /** Every movement of the account that counts. */
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

/** The list's next step: how many it will show, and its link's label. */
export type NextStep = { readonly count: number; readonly label: string };
