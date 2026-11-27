import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, localDate } from "../columns/column.utils";

/**
 * Each month's usury rate for consumer and ordinary credit, as the
 * Superintendencia Financiera certifies it (12.4a): an effective annual
 * rate, in parts per million (28,34% is 283,400), and where it was read.
 * Public figures, linked to no one: any user's context reads them, and only
 * the cron adds them, through `save_usury_rates` (migration 0036).
 */
export const usuryRates = pgTable(
  "usury_rates",
  {
    // The month's first day.
    month: localDate("month").primaryKey(),
    rateEaPpm: integer("rate_ea_ppm").notNull(),
    source: text("source").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("usury_rates_month_check", sql`extract(day from ${t.month}) = 1`),
    // Above nothing and under 1,000% a year, as a card's rates (core).
    check(
      "usury_rates_rate_check",
      sql`${t.rateEaPpm} > 0 and ${t.rateEaPpm} <= 10000000`,
    ),
    check(
      "usury_rates_source_check",
      sql`length(${t.source}) between 1 and 300`,
    ),
  ],
);
