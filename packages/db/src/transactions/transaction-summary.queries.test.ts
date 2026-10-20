import { type CategorizedStatement, periodSchema } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  UNCHECKED,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import type { BalanceCheck } from "../statements/statement.types";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import { listSummaryMovements } from "./transaction-summary.queries";

const THIRD_QUARTER = periodSchema.parse({
  from: "2026-07-01",
  to: "2026-09-30",
});
const FOURTH_QUARTER = periodSchema.parse({
  from: "2026-10-01",
  to: "2026-12-31",
});

const SALARY = "PAGO INTERBANC EMPRESA EJEMPLO";

const newAccount = (ctx: UserContext, last4: string) =>
  resolveIdentifiedAccount(ctx, {
    bankId: "bancolombia",
    accountType: "savings",
    last4,
    currency: "COP",
  });

// Into the account, in this order.
const saveAll = async (
  ctx: UserContext,
  accountId: string,
  statements: readonly [BalanceCheck, Promise<CategorizedStatement>][],
) => {
  for (const [balance, statement] of statements)
    await saveStatement(ctx, {
      accountId,
      balance,
      statement: await statement,
    });
};

describe.skipIf(!testDatabase)("a period's movements for its summary", () => {
  let app: DbClient;
  let userId: UserId;
  let accountId: string;

  const inContext = <T>(read: Parameters<typeof withUserContext<T>>[2]) =>
    withUserContext(app.db, userId, read);

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountId = await inContext(async (ctx) => {
      const id = await newAccount(ctx, "8901");
      await saveAll(ctx, id, [
        // July's export, which the quarter's statement then hides.
        [
          UNCHECKED,
          preparedExport([
            { date: "2026-07-05", amount: 1_000_000, description: SALARY },
            { date: "2026-07-20", amount: -30_000 },
          ]),
        ],
        [
          VERIFIED,
          preparedQuarterly([
            { date: "2026-07-05", amount: 1_000_000, description: SALARY },
            {
              date: "2026-07-15",
              amount: -4_000,
              description: "IMPTO GOBIERNO 4X1000",
            },
            { date: "2026-08-20", amount: -50_000 },
          ]),
        ],
        // The next quarter's statement doesn't reconcile, so on its days
        // only October's export counts, newest first as the bank writes it.
        [
          UNVERIFIED,
          preparedQuarterly([{ date: "2026-10-09", amount: -7_000 }], {
            from: "2026-09-30",
            to: "2026-12-31",
          }),
        ],
        [
          UNCHECKED,
          preparedExport([
            {
              date: "2026-10-05",
              amount: -9_000,
              description: "TRANSFERENCIAS A NEQUI",
              phone: "3001234567",
            },
            { date: "2026-10-02", amount: -3_000 },
          ]),
        ],
      ]);
      // Another account's movement on the same days.
      await saveAll(ctx, await newAccount(ctx, "1234"), [
        [UNCHECKED, preparedExport([{ date: "2026-08-21", amount: -1_000 }])],
      ]);
      return id;
    });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("reads the account's movements that count in the period, with what the summary needs", async () => {
    const movements = await inContext((ctx) =>
      listSummaryMovements(ctx, { accountId, period: THIRD_QUARTER }),
    );
    const without = { referenceHash: null, referenceLast4: null };

    expect(movements).toEqual([
      {
        date: "2026-07-05",
        amountMinor: 1_000_000,
        descriptionRaw: SALARY,
        ...without,
        categoryId: "income_transfer",
        categoryRuleId: "interbank_in",
      },
      {
        date: "2026-07-15",
        amountMinor: -4_000,
        descriptionRaw: "IMPTO GOBIERNO 4X1000",
        ...without,
        categoryId: "taxes_and_fees",
        categoryRuleId: "gmf_tax",
      },
      {
        date: "2026-08-20",
        amountMinor: -50_000,
        descriptionRaw: "COMPRA EN TIENDA",
        ...without,
        categoryId: "other_spending",
        categoryRuleId: "unknown_merchant",
      },
    ]);
  });

  it("reads an export's movements on the days of a statement that doesn't reconcile, the oldest first", async () => {
    const movements = await inContext((ctx) =>
      listSummaryMovements(ctx, { accountId, period: FOURTH_QUARTER }),
    );

    expect(movements.map(({ amountMinor }) => amountMinor)).toEqual([
      -3_000, -9_000,
    ]);
    // A Nequi send names its number by its HMAC and last 4 digits only.
    expect(movements[1]).toMatchObject({
      descriptionRaw: "TRANSFERENCIAS A NEQUI",
      referenceLast4: "4567",
    });
    expect(movements[1]?.referenceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads nothing of another user's account", async () => {
    const stranger = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );

    const movements = await withUserContext(app.db, stranger, (ctx) =>
      listSummaryMovements(ctx, { accountId, period: THIRD_QUARTER }),
    );

    expect(movements).toEqual([]);
  });
});
