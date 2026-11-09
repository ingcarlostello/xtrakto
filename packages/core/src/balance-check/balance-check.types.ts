import type { LocalDate } from "../dates/date.types";
import type { AmountMinor } from "../money/money.types";
import type { DayBalance } from "../summary/summary.types";

/** A balance on a day: a statement's closing, or the one a person typed. */
export type DatedBalance = {
  readonly date: LocalDate;
  readonly amountMinor: AmountMinor;
};

/**
 * What the balance a person typed says about the days only movements files
 * cover (10.3), which is a check on them and never a source. Both name the
 * latest verified closing balance's day, after which they speak.
 */
export type ReportedBalanceCheck =
  | {
      readonly status: "adds_up";
      readonly reported: DatedBalance;
      readonly closingDate: LocalDate;
      /** Each day with movements after the closing, through the day typed. */
      readonly days: readonly DayBalance[];
    }
  | {
      readonly status: "off";
      readonly reported: DatedBalance;
      readonly closingDate: LocalDate;
      /** What was typed minus what the movements add up to. */
      readonly differenceMinor: AmountMinor;
    };
