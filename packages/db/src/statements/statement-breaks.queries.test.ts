import type { PreparedStatement } from "@xtrakto/core";
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
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import {
  findStatementBreaks,
  listUnreconciledStatements,
} from "./statement-breaks.queries";
import { saveStatement } from "./statement.queries";
import type { BalanceCheck } from "./statement.types";

const QUARTER: TestMovement[] = [
  { date: "2026-07-01", amount: -10 },
  { date: "2026-08-15", amount: -2 },
  { date: "2026-09-30", amount: -3 },
];
const PREVIOUS = { from: "2026-03-31", to: "2026-06-30" };

describe.skipIf(!testDatabase)("statements that don't reconcile", () => {
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

  const newAccount = async (userId: UserId, last4 = "8901") =>
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
    return result.value.statementId;
  };

  const unreconciled = (userId: UserId, filter = {}) =>
    withUserContext(app.db, userId, (ctx) =>
      listUnreconciledStatements(ctx, filter),
    );

  it("lists only statements with balances that don't reconcile, by account and by the days they meet", async () => {
    const userId = toUserId(await insertUser(owner.db));
    const accountId = await newAccount(userId);
    const other = await newAccount(userId, "1111");
    const off = await saveIn(userId, accountId, [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);
    await saveIn(userId, accountId, [
      await preparedQuarterly([{ date: "2026-05-01", amount: -1 }], PREVIOUS),
      VERIFIED,
    ]);
    await saveIn(userId, other, [
      await preparedExport([{ date: "2026-08-01", amount: -4 }]),
      UNCHECKED,
    ]);

    expect(await unreconciled(userId)).toEqual([
      {
        id: off,
        accountId,
        period: { from: "2026-06-30", to: "2026-09-30" },
        differenceMinor: -1_000,
      },
    ]);
    expect(await unreconciled(userId, { accountId: other })).toEqual([]);
    // Its opening balance's day, June 30, belongs to the quarter before.
    expect(
      await unreconciled(userId, {
        period: { from: "2026-04-01", to: "2026-06-30" },
      }),
    ).toEqual([]);
    expect(
      await unreconciled(userId, {
        period: { from: "2026-08-01", to: "2026-08-31" },
      }),
    ).toHaveLength(1);
  });

  it("finds a statement that doesn't reconcile with every movement, newest first", async () => {
    const userId = toUserId(await insertUser(owner.db));
    const accountId = await newAccount(userId);
    const off = await saveIn(userId, accountId, [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);

    const breaks = await withUserContext(app.db, userId, (ctx) =>
      findStatementBreaks(ctx, off),
    );

    expect(breaks?.statement).toEqual({
      id: off,
      accountId,
      period: { from: "2026-06-30", to: "2026-09-30" },
      differenceMinor: -1_000,
      openingBalanceMinor: 100_000,
      breakPositions: [3],
    });
    expect(breaks?.account).toMatchObject({ id: accountId, last4: "8901" });
    expect(
      breaks?.movements.map((m) => [
        m.position,
        m.amountMinor,
        m.balanceAfterMinor,
      ]),
    ).toEqual([
      [2, -3, 99_985],
      [1, -2, 99_988],
      [0, -10, 99_990],
    ]);
  });

  it("finds nothing for a statement that reconciles, or another user's", async () => {
    const userId = toUserId(await insertUser(owner.db));
    const accountId = await newAccount(userId);
    const verified = await saveIn(userId, accountId, [
      await preparedQuarterly(QUARTER),
      VERIFIED,
    ]);
    const someone = toUserId(await insertUser(owner.db));
    const theirs = await saveIn(someone, await newAccount(someone), [
      await preparedQuarterly(QUARTER),
      UNVERIFIED,
    ]);

    const found = await withUserContext(app.db, userId, async (ctx) => [
      await findStatementBreaks(ctx, verified),
      await findStatementBreaks(ctx, theirs),
    ]);

    expect(found).toEqual([undefined, undefined]);
  });
});
