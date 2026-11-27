import type { LocalDate } from "@xtrakto/core";
import { asc, sql } from "drizzle-orm";
import type { Database, DbTransaction } from "../client/db-client.types";
import type { UserContext } from "../user-context/user-context.types";
import { usuryRates } from "./usury-rate.schemas";

/** A month's usury rate for consumer and ordinary credit (12.4a). */
export type UsuryRate = {
  /** The month's first day. */
  readonly month: LocalDate;
  /** Effective annual, in parts per million: 28,34% is 283,400. */
  readonly rateEaPpm: number;
  /** Where it was read. */
  readonly source: string;
};

/**
 * Adds the months the table doesn't have, never changing one (12.4a). A
 * query without a user context, as the cron that calls it has none: it runs
 * a database function with its owner's rights (ADR 0014, amended), whose
 * table's checks hold every value. Returns how many months it added.
 */
export const saveUsuryRates = async (
  db: Database | DbTransaction,
  rates: readonly UsuryRate[],
): Promise<number> => {
  if (rates.length === 0) return 0;
  const { rows } = await db.execute<{ saved: number }>(
    sql`select public.save_usury_rates(${JSON.stringify(rates)}::jsonb) as saved`,
  );
  return rows[0]?.saved ?? 0;
};

/** Every month's usury rate, the oldest first: public figures any context reads. */
export const listUsuryRates = ({ tx }: UserContext): Promise<UsuryRate[]> =>
  tx
    .select({
      month: usuryRates.month,
      rateEaPpm: usuryRates.rateEaPpm,
      source: usuryRates.source,
    })
    .from(usuryRates)
    .orderBy(asc(usuryRates.month));
