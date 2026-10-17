import type {
  AmountMinor,
  CategorizedStatement,
  LocalDate,
  Period,
} from "@xtrakto/core";
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
import type { MovementSearch } from "./transaction-search.queries";
import type { BalanceCheck } from "../statements/statement.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  listMovementAccounts,
  listMovementQuarters,
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
      "categoryId",
      "date",
      "descriptionRaw",
      "id",
      "isPendingReview",
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
    [statement, balance]: [CategorizedStatement, BalanceCheck],
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

  it("lists the accounts with movements that count, the latest first", async () => {
    const userId = await newUser();
    const earlier = await newAccount(userId, "1111");
    const later = await newAccount(userId, "2222");
    const withoutMovements = await newAccount(userId, "3333");
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
    await saveIn(userId, withoutMovements, [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);

    const found = await withUserContext(app.db, userId, listMovementAccounts);
    const counted = await withUserContext(app.db, userId, (ctx) =>
      countCountedMovements(ctx),
    );

    expect(found.map(({ id, last4 }) => [id, last4])).toEqual([
      [later, "2222"],
      [earlier, "1111"],
    ]);
    expect(counted).toBe(2);
  });

  it("lists no account until a movement counts", async () => {
    const userId = await newUser();
    const accountId = await newAccount(userId, "8901");
    await saveIn(userId, accountId, [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);

    expect(await withUserContext(app.db, userId, listMovementAccounts)).toEqual(
      [],
    );
  });

  it("lists an account's quarters, verified when every movement comes from a verified quarterly statement", async () => {
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

    const quarters = await withUserContext(app.db, userId, (ctx) =>
      listMovementQuarters(ctx, accountId),
    );
    const julyToSeptember = await withUserContext(app.db, userId, (ctx) =>
      countCountedMovements(ctx, {
        accountId,
        period: { from: "2026-07-01", to: "2026-09-30" } as Period,
      }),
    );

    // The export's June 30 and October 1 stay outside the quarter it covers.
    expect(quarters).toEqual([
      { year: 2026, quarter: 4, verified: false },
      { year: 2026, quarter: 3, verified: true },
      { year: 2026, quarter: 2, verified: false },
    ]);
    expect(julyToSeptember).toBe(3);
  });
});

describe.skipIf(!testDatabase)("searching movements", () => {
  let app: DbClient;
  let userId: UserId;
  let accountId: string;

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountId = await withUserContext(app.db, userId, async (ctx) => {
      const id = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "5555",
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId: id,
        balance: UNCHECKED,
        statement: await preparedExport([
          {
            date: "2026-08-01",
            amount: -9_000_000,
            description: "PAGO PSE Compañía de Finan",
          },
          {
            date: "2026-08-02",
            amount: 9_000_000,
            description: "TRANSFERENCIA DESDE NEQUI",
          },
          {
            date: "2026-08-03",
            amount: -1_250,
            description: "COMPRA EN MERCADO XYZ",
          },
        ]),
      });
      return id;
    });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const found = (search: MovementSearch) =>
    withUserContext(app.db, userId, async (ctx) => {
      const { items } = await listTransactions(ctx, {
        accountId,
        search,
        limit: 10,
        offset: 0,
      });
      const counted = await countCountedMovements(ctx, { accountId, search });
      return { amounts: items.map((t) => t.amountMinor), counted };
    });

  it.each([
    ["ignoring case and accents", { text: "compania de" }, [-9_000_000]],
    [
      "ignoring its own accents and spaces",
      { text: "  COMPAÑÍA  de " },
      [-9_000_000],
    ],
    ["in any part of the text", { text: "nequi" }, [9_000_000]],
    [
      "by an amount with either sign",
      { text: "$90.000", amountMinor: 9_000_000 as AmountMinor },
      [9_000_000, -9_000_000],
    ],
    [
      "by an amount with cents",
      { text: "12,50", amountMinor: 1_250 as AmountMinor },
      [-1_250],
    ],
    ["nothing when nothing matches", { text: "netflix" }, []],
  ])("finds movements %s", async (_, search, expected) => {
    const { amounts, counted } = await found(search);

    expect(amounts).toEqual(expected);
    expect(counted).toBe(expected.length);
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
