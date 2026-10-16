import type { LocalDate, PreparedStatement } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  type TestMovement,
  UNCHECKED,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { countCountedMovements } from "../coverage/coverage.queries";
import { saveStatement } from "../statements/statement.queries";
import type { BalanceCheck } from "../statements/statement.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  findLatestMovementAccount,
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
  let otherAccountId: string;

  const saveAccount = async (owner: UserId, last4: string) =>
    withUserContext(app.db, owner, async (ctx) => {
      const accountId = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4,
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNCHECKED,
        statement: await preparedExport(MOVEMENTS),
      });
      return accountId;
    });

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountIds = [
      await saveAccount(userId, "1111"),
      await saveAccount(userId, "2222"),
    ];
    // Another user's identical movements must never show up.
    const other = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    otherAccountId = await saveAccount(other, "1111");
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const list = (filter: Partial<TransactionFilter>) =>
    withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, {
        accountId: accountIds[0] ?? "",
        limit: 100,
        offset: 0,
        ...filter,
      }),
    );

  it("lists the account's movements newest first, and a day's last movement first", async () => {
    const { items } = await list({});

    expect(items.map((t) => [t.date, t.amountMinor])).toEqual([
      ["2026-10-04", -5],
      ["2026-10-03", -4],
      ["2026-10-02", -3],
      ["2026-10-02", -2],
      ["2026-10-01", -1],
    ]);
  });

  it("returns only what the list shows", async () => {
    const { items } = await list({ limit: 1 });

    expect(Object.keys(items[0] ?? {}).sort()).toEqual([
      "amountMinor",
      "balanceAfterMinor",
      "date",
      "descriptionRaw",
      "id",
    ]);
  });

  it("lists only the account asked for, never another user's", async () => {
    const first = await list({});
    const second = await list({ accountId: accountIds[1] });
    const others = await list({ accountId: otherAccountId });

    expect(second.items).toHaveLength(5);
    expect(
      second.items.filter((t) => first.items.some(({ id }) => id === t.id)),
    ).toEqual([]);
    expect(others.items).toEqual([]);
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
      pages.push(await list({ limit: 2, offset }));

    expect(pages.map((page) => page.hasMore)).toEqual([true, true, false]);
    expect(
      pages.flatMap((page) => page.items.map((t) => t.amountMinor)),
    ).toEqual([-5, -4, -3, -2, -1]);
  });
});

// An export across a quarter's edges: its first and last movement belong to
// the quarters before and after July to September 2026.
const EXPORT_ACROSS_EDGES: TestMovement[] = [
  { date: "2026-06-30", amount: -1 },
  { date: "2026-07-15", amount: -2 },
  { date: "2026-09-30", amount: -3 },
  { date: "2026-10-01", amount: -4 },
];
const QUARTER: TestMovement[] = [
  { date: "2026-07-01", amount: -10 },
  { date: "2026-07-15", amount: -2 },
  { date: "2026-09-30", amount: -3 },
];

describe.skipIf(!testDatabase)("the movements that count", () => {
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

  const newUser = async () => toUserId(await insertUser(owner.db));

  const newAccount = (userId: UserId, last4: string) =>
    withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4,
        currency: "COP",
      }),
    );

  const saveIn = async (
    userId: UserId,
    accountId: string,
    [statement, balance]: [PreparedStatement, BalanceCheck],
  ) => {
    const result = await withUserContext(app.db, userId, (ctx) =>
      saveStatement(ctx, { accountId, statement, balance }),
    );
    if (!result.ok) throw new Error(result.error.code);
  };

  const listed = async (userId: UserId, accountId: string) => {
    const { items } = await withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, { accountId, limit: 100, offset: 0 }),
    );
    return items.map((t) => [t.date, t.amountMinor, t.balanceAfterMinor]);
  };

  it("shows a verified quarterly statement with its balances, and not the export's movements it hides", async () => {
    const userId = await newUser();
    const accountId = await newAccount(userId, "8901");
    await saveIn(userId, accountId, [
      await preparedExport(EXPORT_ACROSS_EDGES),
      UNCHECKED,
    ]);
    await saveIn(userId, accountId, [
      await preparedQuarterly(QUARTER),
      VERIFIED,
    ]);

    expect(await listed(userId, accountId)).toEqual([
      ["2026-10-01", -4, null],
      ["2026-09-30", -3, 99_985],
      ["2026-07-15", -2, 99_988],
      ["2026-07-01", -10, 99_990],
      ["2026-06-30", -1, null],
    ]);
  });

  it("leaves out every movement of a quarterly statement that doesn't reconcile", async () => {
    const userId = await newUser();
    const accountId = await newAccount(userId, "8901");
    await saveIn(userId, accountId, [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);
    await saveIn(userId, accountId, [
      await preparedExport([{ date: "2026-08-01", amount: -5 }]),
      UNCHECKED,
    ]);

    expect(await listed(userId, accountId)).toEqual([["2026-08-01", -5, null]]);
  });

  it("opens on the account whose latest movement that counts is the most recent", async () => {
    const userId = await newUser();
    const earlier = await newAccount(userId, "1111");
    const later = await newAccount(userId, "2222");
    await saveIn(userId, earlier, [
      await preparedExport([{ date: "2026-07-01", amount: -1 }]),
      UNCHECKED,
    ]);
    // Its September movements don't count, so they don't make it the latest.
    await saveIn(userId, earlier, [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);
    await saveIn(userId, later, [
      await preparedExport([{ date: "2026-08-01", amount: -2 }]),
      UNCHECKED,
    ]);

    const found = await withUserContext(
      app.db,
      userId,
      findLatestMovementAccount,
    );
    const counted = await withUserContext(app.db, userId, (ctx) =>
      countCountedMovements(ctx),
    );

    expect(found).toEqual({
      id: later,
      bankId: "bancolombia",
      accountType: "savings",
      last4: "2222",
    });
    expect(counted).toBe(2);
  });

  it("opens on no account until a movement counts", async () => {
    const userId = await newUser();
    const accountId = await newAccount(userId, "8901");
    await saveIn(userId, accountId, [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);

    expect(
      await withUserContext(app.db, userId, findLatestMovementAccount),
    ).toBeUndefined();
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
