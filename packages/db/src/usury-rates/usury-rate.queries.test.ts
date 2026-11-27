import { localDateSchema } from "@xtrakto/core";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import {
  listUsuryRates,
  listUsuryRatesOf,
  saveUsuryRates,
  type UsuryRate,
} from "./usury-rate.queries";

const SOURCE = "Superintendencia Financiera de Colombia, histórico de usura";

// Months no other test uses: the table is shared by every user.
const rate = (month: string, rateEaPpm: number): UsuryRate => ({
  month: localDateSchema.parse(month),
  rateEaPpm,
  source: SOURCE,
});

describe.skipIf(!testDatabase)("each month's usury rate", () => {
  let app: DbClient;
  let owner: DbClient;

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl });
    owner = createDb({ connectionString: ownerUrl });
  });

  afterAll(async () => {
    await app.pool.end();
    await owner.pool.end();
  });

  const readAll = async () => {
    const userId = toUserId(await insertUser(owner.db));
    return withUserContext(app.db, userId, listUsuryRates);
  };

  it("adds the months it doesn't have, and never changes one already there", async () => {
    expect(
      await saveUsuryRates(app.db, [
        rate("2091-09-01", 292_400),
        rate("2091-10-01", 285_900),
      ]),
    ).toBe(2);
    expect(
      await saveUsuryRates(app.db, [
        rate("2091-10-01", 999_999),
        rate("2091-11-01", 283_400),
      ]),
    ).toBe(1);

    expect(
      (await readAll()).filter(({ month }) => month.startsWith("2091")),
    ).toEqual([
      rate("2091-09-01", 292_400),
      rate("2091-10-01", 285_900),
      rate("2091-11-01", 283_400),
    ]);
  });

  it("reads the rates of the months some days fall in, each once, leaving out a month it doesn't have", async () => {
    await saveUsuryRates(app.db, [
      rate("2094-01-01", 243_600),
      rate("2094-02-01", 251_000),
    ]);
    const userId = toUserId(await insertUser(owner.db));

    const rates = await withUserContext(app.db, userId, (ctx) =>
      listUsuryRatesOf(
        ctx,
        ["2094-02-10", "2094-01-15", "2094-01-31", "2094-03-01"].map((day) =>
          localDateSchema.parse(day),
        ),
      ),
    );

    expect(rates).toEqual([
      rate("2094-01-01", 243_600),
      rate("2094-02-01", 251_000),
    ]);
    expect(
      await withUserContext(app.db, userId, (ctx) => listUsuryRatesOf(ctx, [])),
    ).toEqual([]);
  });

  it("refuses a day that isn't a month's first, or a rate out of range", async () => {
    await expect(
      saveUsuryRates(app.db, [rate("2092-09-15", 292_400)]),
    ).rejects.toThrow();
    await expect(
      saveUsuryRates(app.db, [rate("2092-10-01", 0)]),
    ).rejects.toThrow();
  });

  it("lets the application read them, and never add, change or delete one itself", async () => {
    await saveUsuryRates(app.db, [rate("2093-01-01", 250_000)]);

    await expect(
      app.db.execute(
        sql`insert into usury_rates (month, rate_ea_ppm, source) values ('2093-02-01', 1, 'x')`,
      ),
    ).rejects.toThrow();
    await expect(
      app.db.execute(sql`update usury_rates set rate_ea_ppm = 1`),
    ).rejects.toThrow();
    await expect(
      app.db.execute(sql`delete from usury_rates`),
    ).rejects.toThrow();
    expect(
      (await readAll()).find(({ month }) => month === "2093-01-01"),
    ).toEqual(rate("2093-01-01", 250_000));
  });
});
