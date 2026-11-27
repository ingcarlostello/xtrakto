import "server-only";
import type { LocalDate } from "@xtrakto/core";
import { listUsuryRatesOf, type UserContext } from "@xtrakto/db";
import type { UsuryRates } from "./card-rates.types";

/**
 * The usury rates of the months some days fall in (12.4b), by month
 * (`"2026-10"`): those the Superintendencia Financiera's history brought.
 */
export const readUsuryRates = async (
  ctx: UserContext,
  days: readonly LocalDate[],
): Promise<UsuryRates> =>
  new Map(
    (await listUsuryRatesOf(ctx, days)).map(({ month, rateEaPpm }) => [
      month.slice(0, 7),
      rateEaPpm,
    ]),
  );
