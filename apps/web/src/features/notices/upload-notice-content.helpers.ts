import {
  type LocalDate,
  type RecurringPayment,
  risenRecurringInsights,
} from "@xtrakto/core";
import type { IngestionJobResult } from "@xtrakto/db";

type JobStatement = NonNullable<IngestionJobResult["statement"]>;

/**
 * The statements an upload saved something new with, the latest first. The
 * same file again points at the statement saved before, and brings nothing.
 */
export const statementsBrought = (
  jobs: readonly IngestionJobResult[],
): JobStatement[] =>
  jobs
    .flatMap(({ statement, stats }) =>
      statement !== null && stats.skipped !== stats.total ? [statement] : [],
    )
    .sort((a, b) => b.period.to.localeCompare(a.period.to));

/**
 * How many fixed payments these movements made rise. A payment that rose has
 * its highest amount in its last month (`AmountTrend` "rose"), so the upload
 * made it rise when it brought that last payment.
 */
export const countRisenBy = (
  spending: readonly RecurringPayment[],
  brought: readonly {
    readonly date: LocalDate;
    readonly descriptionRaw: string;
  }[],
): number =>
  risenRecurringInsights(spending).filter(({ payment }) =>
    brought.some(
      ({ date, descriptionRaw }) =>
        date === payment.lastDate && payment.bankTexts.includes(descriptionRaw),
    ),
  ).length;
