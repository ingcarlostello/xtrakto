import { categoriesOfKind, periodSchema } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  UNCHECKED,
  UNVERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { countCountedMovements } from "../coverage/coverage.queries";
import { saveStatement } from "../statements/statement.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import type { MovementSelection } from "./transaction-selection.queries";
import { listCategoryTotals } from "./transaction-totals.queries";
import { listTransactions } from "./transaction.queries";

const OCTOBER = periodSchema.parse({ from: "2026-10-01", to: "2026-10-31" });

// A month of an export: spending, a key payment to review, an investment,
// money back from Nequi to review, interest, and money in no rule knows.
const MOVEMENTS = [
  {
    date: "2026-10-01",
    amount: -1_000_000,
    description: "TRANSFERENCIAS A NEQUI",
  },
  {
    date: "2026-10-02",
    amount: -500_000,
    description: "TRANSFERENCIAS A NEQUI",
  },
  {
    date: "2026-10-03",
    amount: -200_000,
    description: "PAGO LLAVE Maria Lopez",
  },
  {
    date: "2026-10-04",
    amount: -3_000_000,
    description: "APERTURA INV VIRTUAL SVP",
  },
  {
    date: "2026-10-05",
    amount: 800_000,
    description: "TRANSFERENCIA DESDE NEQUI",
  },
  { date: "2026-10-06", amount: 420, description: "ABONO INTERESES AHORROS" },
  { date: "2026-10-07", amount: 1_000, description: "ABONO EJEMPLO" },
  // Another month: outside the period.
  { date: "2026-11-02", amount: -9_000, description: "TRANSFERENCIAS A NEQUI" },
];

describe.skipIf(!testDatabase)("movement totals and selection", () => {
  let app: DbClient;
  let userId: UserId;
  let accountId: string;

  const inContext = <T>(read: Parameters<typeof withUserContext<T>>[2]) =>
    withUserContext(app.db, userId, read);

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountId = await inContext(async (ctx) => {
      const id = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId: id,
        balance: UNCHECKED,
        statement: await preparedExport(MOVEMENTS),
      });
      // A quarterly statement that doesn't reconcile counts nowhere.
      await saveStatement(ctx, {
        accountId: id,
        balance: UNVERIFIED,
        statement: await preparedQuarterly(
          [
            {
              date: "2026-10-09",
              amount: -7_000,
              description: "COMPRA EN TIENDA",
            },
          ],
          { from: "2026-09-30", to: "2026-12-31" },
        ),
      });
      return id;
    });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("adds up a period's movements that count by category, in each direction", async () => {
    const totals = await inContext((ctx) =>
      listCategoryTotals(ctx, { accountId, period: OCTOBER }),
    );

    expect(totals).toEqual(
      expect.arrayContaining([
        {
          categoryId: "transfers_to_people",
          inMinor: 0,
          inCount: 0,
          outMinor: -1_700_000,
          outCount: 3,
        },
        {
          categoryId: "investment",
          inMinor: 0,
          inCount: 0,
          outMinor: -3_000_000,
          outCount: 1,
        },
        {
          categoryId: "own_account_transfer",
          inMinor: 800_000,
          inCount: 1,
          outMinor: 0,
          outCount: 0,
        },
        {
          categoryId: "interest",
          inMinor: 420,
          inCount: 1,
          outMinor: 0,
          outCount: 0,
        },
        {
          categoryId: null,
          inMinor: 1_000,
          inCount: 1,
          outMinor: 0,
          outCount: 0,
        },
      ]),
    );
    expect(totals).toHaveLength(5);
  });

  it.each([
    [
      "a kind's categories",
      { categoryIds: categoriesOfKind("internal") },
      [800_000, -3_000_000],
    ],
    ["the movements to review", { isPendingReview: true }, [800_000, -200_000]],
  ] as const)(
    "lists and counts only %s",
    async (_, selection: MovementSelection, amounts) => {
      const { items } = await inContext((ctx) =>
        listTransactions(ctx, {
          accountId,
          period: OCTOBER,
          limit: 100,
          offset: 0,
          ...selection,
        }),
      );
      const counted = await inContext((ctx) =>
        countCountedMovements(ctx, {
          accountId,
          period: OCTOBER,
          ...selection,
        }),
      );

      expect(items.map(({ amountMinor }) => amountMinor)).toEqual(amounts);
      expect(counted).toBe(amounts.length);
    },
  );
});
