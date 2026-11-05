import { type CategorizedStatement, periodSchema } from "@xtrakto/core";
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
import { countPeriodFiles } from "./statement-files.queries";
import { saveStatement } from "./statement.queries";
import type { BalanceCheck } from "./statement.types";

const JULY: TestMovement[] = [
  { date: "2026-07-10", amount: -2_000 },
  { date: "2026-07-20", amount: -500 },
];
const AUGUST: TestMovement[] = [{ date: "2026-08-14", amount: -9_000 }];
const THIRD_QUARTER = { from: "2026-07-01", to: "2026-09-30" };
const FOURTH_QUARTER = { from: "2026-09-30", to: "2026-12-31" };

describe.skipIf(!testDatabase)("files of a period", () => {
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

  const newAccount = async () => {
    const userId = toUserId(await insertUser(owner.db));
    const accountId = await withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
      }),
    );
    return { userId, accountId };
  };

  type Account = Awaited<ReturnType<typeof newAccount>>;

  const save = (
    { userId, accountId }: Account,
    statement: CategorizedStatement,
    balance: BalanceCheck,
  ) =>
    withUserContext(app.db, userId, (ctx) =>
      saveStatement(ctx, { accountId, statement, balance }),
    );

  const filesOf = (
    { userId, accountId }: Account,
    days: { readonly from: string; readonly to: string },
  ) =>
    withUserContext(app.db, userId, (ctx) =>
      countPeriodFiles(ctx, { accountId, period: periodSchema.parse(days) }),
    );

  it("counts the quarterly statement and each movements file it joined", async () => {
    const account = await newAccount();
    await save(
      account,
      await preparedQuarterly([...JULY, ...AUGUST]),
      VERIFIED,
    );
    await save(account, await preparedExport(JULY), UNCHECKED);
    await save(account, await preparedExport(AUGUST), UNCHECKED);

    expect(await filesOf(account, THIRD_QUARTER)).toEqual({
      quarterly: 1,
      movements: 2,
    });
    expect(
      await filesOf(account, { from: "2026-07-01", to: "2026-07-31" }),
    ).toEqual({ quarterly: 1, movements: 1 });
  });

  it("counts movements files on days no quarterly statement covers", async () => {
    const account = await newAccount();
    await save(account, await preparedExport(JULY), UNCHECKED);
    await save(account, await preparedExport(AUGUST), UNCHECKED);

    expect(await filesOf(account, THIRD_QUARTER)).toEqual({
      quarterly: 0,
      movements: 2,
    });
  });

  it("leaves out a file whose movements another saved before", async () => {
    const account = await newAccount();
    await save(account, await preparedExport(JULY), UNCHECKED);
    // Another file of the same days, whose movements share fingerprints.
    await save(account, await preparedExport(JULY.slice(1)), UNCHECKED);

    expect(await filesOf(account, THIRD_QUARTER)).toEqual({
      quarterly: 0,
      movements: 1,
    });
  });

  it("leaves out the next quarter's statement, which opens on the period's last day", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(JULY), VERIFIED);
    await save(
      account,
      await preparedQuarterly([{ date: "2026-10-02", amount: -7 }], {
        ...FOURTH_QUARTER,
        openingMinor: 97_500,
      }),
      VERIFIED,
    );

    expect(await filesOf(account, THIRD_QUARTER)).toEqual({
      quarterly: 1,
      movements: 0,
    });
  });

  it("leaves out a quarterly statement that doesn't reconcile, whose movements count nowhere", async () => {
    const account = await newAccount();
    const october: TestMovement[] = [{ date: "2026-10-02", amount: -7 }];
    await save(
      account,
      await preparedQuarterly(october, FOURTH_QUARTER),
      UNVERIFIED,
    );
    await save(account, await preparedExport(october), UNCHECKED);

    expect(await filesOf(account, FOURTH_QUARTER)).toEqual({
      quarterly: 0,
      movements: 1,
    });
  });

  it("counts no file of another account or user", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(JULY), VERIFIED);
    const otherAccountId = await withUserContext(
      app.db,
      account.userId,
      (ctx) =>
        resolveIdentifiedAccount(ctx, {
          bankId: "bancolombia",
          accountType: "savings",
          last4: "2109",
          currency: "COP",
        }),
    );
    const stranger = await newAccount();

    expect(
      await filesOf({ ...account, accountId: otherAccountId }, THIRD_QUARTER),
    ).toEqual({ quarterly: 0, movements: 0 });
    expect(
      await filesOf(
        { ...stranger, accountId: account.accountId },
        THIRD_QUARTER,
      ),
    ).toEqual({ quarterly: 0, movements: 0 });
  });
});
