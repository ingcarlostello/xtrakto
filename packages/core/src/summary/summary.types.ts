import type { CategoryId } from "../categories/category.types";
import type { CategorizationRuleId } from "../categorization/categorization.types";
import type { LocalDate } from "../dates/date.types";
import type { AmountMinor } from "../money/money.types";

/** Some movements: their amounts added up, and how many. */
export type MovementTotal = {
  readonly amountMinor: AmountMinor;
  readonly count: number;
};

/** A category's movements that count in a period: money in and money out. */
export type CategoryTotals = {
  /** `null` for the movements no rule knows. */
  readonly categoryId: CategoryId | null;
  readonly inMinor: AmountMinor;
  readonly inCount: number;
  /** Negative, as the movements' amounts are. */
  readonly outMinor: AmountMinor;
  readonly outCount: number;
};

/** A period's movements that count, by kind (design-system.md §3.4). */
export type KindTotals = {
  readonly income: MovementTotal;
  readonly spending: MovementTotal;
  /** Money that only moved goes both ways: out, and back. */
  readonly moved: { readonly out: MovementTotal; readonly back: MovementTotal };
};

/** A movement that counts, as a period's summary reads it. */
export type SummaryMovement = {
  readonly date: LocalDate;
  readonly amountMinor: AmountMinor;
  readonly categoryId: CategoryId | null;
  /** The table's rule that matched it, which tells the 4x1000 from the bank's other costs. */
  readonly categoryRuleId: CategorizationRuleId | null;
};

/** A category's movements of its kind: real spending, or income. */
export type CategoryTotal = MovementTotal & {
  readonly categoryId: CategoryId;
};

/** The money that moved through a category, each way. */
export type CategoryMoved = {
  readonly categoryId: CategoryId;
  readonly out: MovementTotal;
  readonly back: MovementTotal;
};

/** A day's movements by kind, which the summary's day-by-day chart reads. */
export type DayTotals = {
  readonly date: LocalDate;
  readonly kinds: KindTotals;
};

/** What a period's movements that count add up to, for its summary. */
export type PeriodSummary = {
  /** Every movement out, whatever its kind: "Salieron $54,2M". */
  readonly outflows: MovementTotal;
  readonly kinds: KindTotals;
  /** The largest first. */
  readonly spendingByCategory: readonly CategoryTotal[];
  /** The largest first. */
  readonly incomeByCategory: readonly CategoryTotal[];
  /** To the investment, between the accounts, to the cards: the most that went out first. */
  readonly movedByCategory: readonly CategoryMoved[];
  /** The days with movements, the oldest first. */
  readonly days: readonly DayTotals[];
  /** What the account and its investment paid. */
  readonly interest: MovementTotal;
  /** The tax on financial movements. */
  readonly gmfTax: MovementTotal;
  readonly cash: MovementTotal;
  /** No card statement holds them until Stage 12. */
  readonly cardPayments: MovementTotal;
};
