import { localDateSchema } from "@xtrakto/core";
import { type Database, saveUsuryRates } from "@xtrakto/db";

/**
 * Invented usury rates for the months the card fixtures' statements close
 * in (12.4b): September and October 2026. The table is shared and a month
 * saved never changes, so every test saves the same ones.
 */
export const FIXTURE_USURY_RATES = new Map([
  ["2026-09", 290_000],
  ["2026-10", 280_000],
]);

/** Saves them in the test database, where they may already be. */
export const saveFixtureUsuryRates = (db: Database): Promise<number> =>
  saveUsuryRates(
    db,
    [...FIXTURE_USURY_RATES].map(([month, rateEaPpm]) => ({
      month: localDateSchema.parse(`${month}-01`),
      rateEaPpm,
      source: "Tasas inventadas para pruebas",
    })),
  );
