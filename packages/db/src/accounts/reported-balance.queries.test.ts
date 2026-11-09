import { amountMinorSchema, localDateSchema } from "@xtrakto/core";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  UNCHECKED,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { findLatestVerifiedClosing } from "../statements/statement-figures.queries";
import { saveStatement } from "../statements/statement.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { deleteAllUserData, findOrCreateUser } from "../users/user.queries";
import { resolveIdentifiedAccount } from "./account.queries";
import { accounts } from "./account.schemas";
import {
  findReportedBalance,
  listReportedBalances,
  saveReportedBalance,
} from "./reported-balance.queries";

const CHECK_VIOLATION = "23514";
const balance = (date: string, amount: number) => ({
  date: localDateSchema.parse(date),
  amountMinor: amountMinorSchema.parse(amount),
});

describe.skipIf(!testDatabase)("the balance a person typed", () => {
  let app: DbClient;
  let owner: DbClient;

  const newUser = () => findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
  const accountOf = (userId: UserId, last4 = "8901") =>
    withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        currency: "COP",
        last4,
      }),
    );

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl });
    owner = createDb({ connectionString: ownerUrl });
  });

  afterAll(async () => {
    await Promise.all([app.pool.end(), owner.pool.end()]);
  });

  it("keeps the latest balance typed on the account", async () => {
    const userId = await newUser();
    const accountId = await accountOf(userId);

    const read = () =>
      withUserContext(app.db, userId, (ctx) =>
        findReportedBalance(ctx, accountId),
      );
    const save = (date: string, amount: number) =>
      withUserContext(app.db, userId, (ctx) =>
        saveReportedBalance(ctx, accountId, balance(date, amount)),
      );

    expect(await read()).toBeUndefined();
    expect(await save("2026-11-05", 750_000)).toBe(true);
    expect(await read()).toEqual({
      date: "2026-11-05",
      amountMinor: 750_000,
    });
    expect(await save("2026-11-09", 720_000)).toBe(true);
    expect(await read()).toEqual({
      date: "2026-11-09",
      amountMinor: 720_000,
    });
  });

  it("neither reads nor writes another user's account", async () => {
    const [ana, other] = [await newUser(), await newUser()];
    const anaAccount = await accountOf(ana);
    await withUserContext(app.db, ana, (ctx) =>
      saveReportedBalance(ctx, anaAccount, balance("2026-11-05", 750_000)),
    );

    const [saved, read] = await withUserContext(app.db, other, async (ctx) => [
      await saveReportedBalance(ctx, anaAccount, balance("2026-11-05", 1)),
      await findReportedBalance(ctx, anaAccount),
    ]);

    expect(saved).toBe(false);
    expect(read).toBeUndefined();
    expect(
      await withUserContext(app.db, ana, (ctx) =>
        findReportedBalance(ctx, anaAccount),
      ),
    ).toEqual({ date: "2026-11-05", amountMinor: 750_000 });
  });

  it("lists each account's for the export, with its account", async () => {
    const userId = await newUser();
    const first = await accountOf(userId, "8901");
    await accountOf(userId, "4321");
    await withUserContext(app.db, userId, (ctx) =>
      saveReportedBalance(ctx, first, balance("2026-11-05", 750_000)),
    );

    expect(await withUserContext(app.db, userId, listReportedBalances)).toEqual(
      [
        {
          bankId: "bancolombia",
          accountType: "savings",
          accountLast4: "8901",
          date: "2026-11-05",
          amountMinor: 750_000,
        },
      ],
    );
  });

  it("goes with the person's data", async () => {
    const userId = await newUser();
    const accountId = await accountOf(userId);
    await withUserContext(app.db, userId, (ctx) =>
      saveReportedBalance(ctx, accountId, balance("2026-11-05", 750_000)),
    );

    await withUserContext(app.db, userId, (ctx) => deleteAllUserData(ctx));

    expect(
      await owner.db.select().from(accounts).where(eq(accounts.id, accountId)),
    ).toEqual([]);
  });

  it("refuses a balance without its day", async () => {
    const accountId = await accountOf(await newUser());

    const update = owner.db
      .update(accounts)
      .set({ reportedBalanceMinor: amountMinorSchema.parse(1) })
      .where(eq(accounts.id, accountId));

    expect(await pgErrorCode(update)).toBe(CHECK_VIOLATION);
  });

  describe("the latest verified closing it's compared with", () => {
    it("is the latest quarterly statement that reconciles, never another's", async () => {
      const userId = await newUser();
      const accountId = await accountOf(userId);
      const other = await newUser();
      const closing = (user: UserId) =>
        withUserContext(app.db, user, (ctx) =>
          findLatestVerifiedClosing(ctx, accountId),
        );

      expect(await closing(userId)).toBeUndefined();
      await withUserContext(app.db, userId, async (ctx) => {
        // A verified quarter closing on 99.000, after an earlier one.
        await saveStatement(ctx, {
          accountId,
          balance: VERIFIED,
          statement: await preparedQuarterly([
            { date: "2026-08-20", amount: -1_000 },
          ]),
        });
        await saveStatement(ctx, {
          accountId,
          balance: VERIFIED,
          statement: await preparedQuarterly(
            [{ date: "2026-05-20", amount: -500 }],
            { from: "2026-03-31", to: "2026-06-30" },
          ),
        });
        // A later quarter that doesn't reconcile, and a movements export.
        await saveStatement(ctx, {
          accountId,
          balance: UNVERIFIED,
          statement: await preparedQuarterly(
            [{ date: "2026-11-01", amount: -3_000 }],
            { from: "2026-09-30", to: "2026-12-31", openingMinor: 99_000 },
          ),
        });
        await saveStatement(ctx, {
          accountId,
          balance: UNCHECKED,
          statement: await preparedExport([
            { date: "2026-10-05", amount: -2_000 },
          ]),
        });
      });

      expect(await closing(userId)).toEqual({
        date: "2026-09-30",
        amountMinor: 99_000,
      });
      expect(await closing(other)).toBeUndefined();
    });
  });
});
