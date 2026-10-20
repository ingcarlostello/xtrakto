import { periodSchema } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedQuarterly,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import { listBankFigures } from "./statement-figures.queries";
import { saveStatement } from "./statement.queries";

const period = (from: string, to: string) => periodSchema.parse({ from, to });

const THIRD_QUARTER_FIGURES = {
  period: { from: "2026-06-30", to: "2026-09-30" },
  averageBalanceMinor: 513_425_900,
  interestMinor: 1_882,
};

describe.skipIf(!testDatabase)("the bank's own figures", () => {
  let app: DbClient;
  let userId: UserId;
  let accountId: string;

  const figuresOf = (from: string, to: string, user = userId) =>
    withUserContext(app.db, user, (ctx) =>
      listBankFigures(ctx, { accountId, period: period(from, to) }),
    );

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountId = await withUserContext(app.db, userId, async (ctx) => {
      const id = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId: id,
        balance: VERIFIED,
        statement: await preparedQuarterly(
          [{ date: "2026-08-20", amount: -50_000 }],
          {
            totals: {
              averageBalanceMinor: THIRD_QUARTER_FIGURES.averageBalanceMinor,
              interestMinor: THIRD_QUARTER_FIGURES.interestMinor,
            },
          },
        ),
      });
      // The next quarter's doesn't reconcile.
      await saveStatement(ctx, {
        accountId: id,
        balance: UNVERIFIED,
        statement: await preparedQuarterly(
          [{ date: "2026-10-09", amount: -7_000 }],
          {
            from: "2026-09-30",
            to: "2026-12-31",
            totals: { averageBalanceMinor: 600_000_000, interestMinor: 2_000 },
          },
        ),
      });
      return id;
    });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("reads them from the quarterly statement of the period", async () => {
    expect(await figuresOf("2026-07-01", "2026-09-30")).toEqual([
      THIRD_QUARTER_FIGURES,
    ]);
  });

  it("reads them for a month from its quarter's statement", async () => {
    expect(await figuresOf("2026-08-01", "2026-08-31")).toEqual([
      THIRD_QUARTER_FIGURES,
    ]);
  });

  it.each([
    [
      "the quarter before, whose last day only opens it",
      "2026-04-01",
      "2026-06-30",
    ],
    ["a quarter whose statement doesn't reconcile", "2026-10-01", "2026-12-31"],
  ])("reads none for %s", async (_, from, to) => {
    expect(await figuresOf(from, to)).toEqual([]);
  });

  it("reads none of another user's account", async () => {
    const stranger = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );

    expect(await figuresOf("2026-07-01", "2026-09-30", stranger)).toEqual([]);
  });
});
