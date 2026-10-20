import type { CategoryId } from "../categories/category.types";
import type { CategorizationRuleId } from "../categorization/categorization.types";
import type { ChannelId } from "../categorization/channel.types";
import type { CalendarMonth, LocalDate } from "../dates/date.types";
import type { AmountMinor } from "../money/money.types";

/** A movement that counts, as the search for payments that repeat reads it. */
export type RecurringMovement = {
  readonly date: LocalDate;
  readonly amountMinor: AmountMinor;
  /** As the bank printed it. */
  readonly descriptionRaw: string;
  /** The number it went to, as its HMAC, which names who a Nequi send paid. */
  readonly referenceHash: string | null;
  readonly referenceLast4: string | null;
  readonly categoryId: CategoryId | null;
  /** The table's rule that matched it, which tells the 4x1000 apart. */
  readonly categoryRuleId: CategorizationRuleId | null;
};

/** How a payment's amount moves from month to month. */
export type AmountTrend =
  /** "Estable". */
  | { readonly kind: "stable" }
  /** "Subió 12%": from its first month to its last, its highest. */
  | { readonly kind: "rose"; readonly percent: number }
  /** "Varía poco". */
  | { readonly kind: "varies_little" }
  /** "Monto variable". */
  | { readonly kind: "variable" };

/** A month of a payment that repeats: its payments added up, and each one. */
export type RecurringMonth = {
  readonly month: CalendarMonth;
  readonly amountMinor: AmountMinor;
  /** In date order: a loan's two installments, "$1.540.000 y $311.000". */
  readonly payments: readonly AmountMinor[];
};

/** A payment made month after month, with what the bank and its months say. */
export type RecurringPayment = {
  /**
   * Who was paid, as the bank last wrote it after its channel's words
   * ("Financiera Andes S"), or its whole text when a number names who
   * ("TRANSFERENCIAS A NEQUI").
   */
  readonly label: string;
  /** The last 4 digits of the number paid, when a number names who. */
  readonly referenceLast4: string | null;
  /** The ways the bank wrote it, the latest first. */
  readonly bankTexts: readonly string[];
  /** The latest payment's. */
  readonly categoryId: CategoryId;
  readonly channels: readonly ChannelId[];
  /** The months in a row it was paid, the oldest first. */
  readonly months: readonly RecurringMonth[];
  /** Its middle month's amount. */
  readonly typicalAmountMinor: AmountMinor;
  /** The days of the month it's paid on: one ("día 5"), or a range ("entre el 1 y el 4"). */
  readonly days: { readonly first: number; readonly last: number };
  readonly lastDate: LocalDate;
  readonly trend: AmountTrend;
};

/** The payments that repeat, the largest first. */
export type RecurringPayments = {
  /** Real spending: "Tus pagos fijos". */
  readonly spending: readonly RecurringPayment[];
  /** Card payments and savings, which repeat but aren't spending. */
  readonly moved: readonly RecurringPayment[];
};
