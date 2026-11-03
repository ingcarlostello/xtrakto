import type { CategoryId, CategoryKind } from "../categories/category.types";
import type { MoneyDirection } from "../categorization/categorization.types";
import type { LocalDate } from "../dates/date.types";
import type { AmountMinor } from "../money/money.types";

/** What "Tu extracto, traducido" reads of a movement. */
export type TranslatableMovement = {
  readonly date: LocalDate;
  readonly amountMinor: AmountMinor;
  /** As the bank printed it. */
  readonly descriptionRaw: string;
  readonly categoryId: CategoryId | null;
  /** The category is a best guess the quick review asks about. */
  readonly isPendingReview: boolean;
};

/**
 * The lines one filter shows: a kind's, or those to review, as
 * Movimientos's filters keep them; every kind without one.
 */
export type LineFilter = "income" | "spending" | "moved" | "review";

/** What a line means, in the code's words: the first of these that holds. */
export type LineNote =
  /** Its category is a guess the quick review asks about. */
  | { readonly kind: "guess"; readonly categoryId: CategoryId }
  /** A fixed payment, on these days of each month. */
  | {
      readonly kind: "fixed";
      readonly days: { readonly first: number; readonly last: number };
    }
  /** Money that only moved, one way. */
  | {
      readonly kind: "moved";
      readonly categoryId: CategoryId;
      readonly direction: MoneyDirection;
    }
  /**
   * Its text's other movements of the period, how many, what all of them
   * add up to, and the other's day when there is one.
   */
  | {
      readonly kind: "sum";
      readonly others: number;
      readonly totalMinor: AmountMinor;
      readonly otherDate?: LocalDate;
    }
  /** What it counts as; no kind while nothing says what it is. */
  | { readonly kind: "counts"; readonly categoryKind?: CategoryKind };

/** A line of "Tu extracto, traducido" (8.6c). */
export type TranslatedLine<T extends TranslatableMovement> = {
  /** The largest of its text's movements in the period. */
  readonly movement: T;
  readonly note: LineNote;
};
