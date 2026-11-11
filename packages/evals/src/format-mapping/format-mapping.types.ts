import type {
  ColumnRole,
  ExtractedContent,
  FormatMapping,
} from "@xtrakto/core";

/** How an invented layout writes its dates. */
export type DateStyle =
  | "dmy_slash"
  | "dmy_dash"
  | "dmy_time"
  | "dmy_short_year"
  | "dmy_month_name"
  | "mdy_slash"
  | "ymd_dash"
  | "date_cell";

/** How an invented layout writes its amounts. */
export type NumberStyle = "comma" | "point" | "comma_peso" | "number_cell";

/** What a column no mapping reads holds. */
export type IgnoredValue =
  "second_date" | "branch" | "fee" | "available_balance" | "channel";

export type LayoutColumn = {
  readonly role: ColumnRole;
  /** As the file's header writes it. */
  readonly name: string;
  /** What a column of role `none` holds. */
  readonly holds?: IgnoredValue;
};

/** An invented bank's spreadsheet, as the set writes it. */
export type Layout = {
  readonly name: string;
  readonly columns: readonly LayoutColumn[];
  readonly dates: DateStyle;
  readonly numbers: NumberStyle;
  readonly directionWords?: { readonly in: string; readonly out: string };
  /** The bank's name, the holder's and the account's above the table. */
  readonly titleRows: boolean;
  /** Totals and a note under the table. */
  readonly footer: boolean;
  /** A "SALDO ANTERIOR" row with the opening balance. */
  readonly openingRow: boolean;
  readonly newestFirst: boolean;
  /** The empty side of money out and in reads 0 rather than nothing. */
  readonly zeroSide: boolean;
  /** Written by hand to be hard: names in English, two amounts, two balances. */
  readonly isHard: boolean;
};

/** One case of the set: an invented file, and how a person would map it. */
export type MappingCase = {
  readonly name: string;
  readonly content: ExtractedContent;
  readonly expected: FormatMapping;
  readonly headerRow: number;
  readonly movementCount: number;
  readonly hasBalances: boolean;
  readonly isHard: boolean;
};

/**
 * What a model proposed for a case: the role it gave each column, nothing
 * when it gave no answer; and the mapping the code made with those roles,
 * when it could read the file's formats with them (11.2b).
 */
export type MappingPrediction = {
  readonly testCase: MappingCase;
  readonly roles?: readonly ColumnRole[];
  readonly proposed?: FormatMapping;
};

/** The shares of the set a model must get right. */
export type MappingThresholds = {
  readonly rolesRightShare: number;
  readonly readRightShare: number;
};

/** How a model did on the set, in figures only. */
export type MappingScore = {
  readonly files: number;
  readonly answered: number;
  /** Files whose every column's role is right. */
  readonly rolesRight: number;
  readonly rolesRightShare: number;
  /** Files whose proposal reads every movement and, with balances, reconciles. */
  readonly readRight: number;
  readonly readRightShare: number;
  /** Each role's share of the columns that hold it, given that role. */
  readonly roleAccuracy: ReadonlyMap<ColumnRole, number>;
};
