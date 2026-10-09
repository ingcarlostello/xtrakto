import type { LocalDate } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { preparedExport } from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { findOrCreateAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  listTransactions,
  type TransactionFilter,
} from "./transaction.queries";

const MOVEMENTS = [
  { date: "2026-10-01", amount: -1 },
  { date: "2026-10-02", amount: -2 },
  { date: "2026-10-02", amount: -3 },
  { date: "2026-10-03", amount: -4 },
  { date: "2026-10-04", amount: -5 },
];

describe.skipIf(!testDatabase)("listTransactions", () => {
  let app: DbClient;
  let userId: UserId;
  let accountIds: string[];

  const saveAccount = async (last4: string) =>
    withUserContext(app.db, userId, async (ctx) => {
      const accountId = await findOrCreateAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4,
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId,
        balanceVerified: false,
        statement: await preparedExport(MOVEMENTS),
      });
      return accountId;
    });

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountIds = [await saveAccount("1111"), await saveAccount("2222")];
    // Another user's identical movements must never show up.
    const other = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    await withUserContext(app.db, other, async (ctx) => {
      const accountId = await findOrCreateAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "1111",
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId,
        balanceVerified: false,
        statement: await preparedExport(MOVEMENTS),
      });
    });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const list = (filter: Partial<TransactionFilter>) =>
    withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, { limit: 100, offset: 0, ...filter }),
    );

  it("lists only the user's movements, newest first and in bank order within a day", async () => {
    const { items } = await list({ accountId: accountIds[0] });

    expect(items.map((t) => [t.date, t.amountMinor])).toEqual([
      ["2026-10-04", -5],
      ["2026-10-03", -4],
      ["2026-10-02", -3],
      ["2026-10-02", -2],
      ["2026-10-01", -1],
    ]);
  });

  it("covers every account without a filter", async () => {
    const { items } = await list({});

    expect(items).toHaveLength(10);
    expect(new Set(items.map((t) => t.userId))).toEqual(new Set([userId]));
  });

  it("filters by an inclusive period", async () => {
    const period = {
      from: "2026-10-02" as LocalDate,
      to: "2026-10-03" as LocalDate,
    };
    const { items } = await list({ accountId: accountIds[1], period });

    expect(items.map((t) => t.amountMinor)).toEqual([-4, -3, -2]);
  });

  it("pages without gaps or repeats", async () => {
    const pages = [];
    for (const offset of [0, 2, 4])
      pages.push(await list({ accountId: accountIds[0], limit: 2, offset }));

    expect(pages.map((page) => page.hasMore)).toEqual([true, true, false]);
    expect(
      pages.flatMap((page) => page.items.map((t) => t.amountMinor)),
    ).toEqual([-5, -4, -3, -2, -1]);
  });
});

describe.skipIf(!testDatabase)("findOrCreateUser", () => {
  it("gives concurrent first requests one id", async () => {
    const app = createDb({ connectionString: requireTestDatabase().appUrl });
    try {
      const clerkUserId = `test_${crypto.randomUUID()}`;
      const ids = await Promise.all(
        [1, 2, 3].map(() => findOrCreateUser(app.db, clerkUserId)),
      );

      expect(new Set(ids).size).toBe(1);
    } finally {
      await app.pool.end();
    }
  });
});
