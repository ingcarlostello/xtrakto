import type { CategorizedStatement } from "@xtrakto/core";
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
import {
  listMatchCandidates,
  saveMatches,
} from "../coverage/movement-match.queries";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import { listAccountCoverage } from "./account-coverage.queries";
import { countUserFiles } from "./statement-files.queries";
import { saveStatement } from "./statement.queries";
import type { BalanceCheck } from "./statement.types";

const NEQUI = "TRANSFERENCIAS A NEQUI";
const JULY: TestMovement[] = [
  { date: "2026-07-10", amount: -2_000, description: NEQUI },
  { date: "2026-07-20", amount: -500 },
];
// The same movements as a movements file writes them: the send with its number.
const JULY_EXPORT: TestMovement[] = [
  {
    date: "2026-07-10",
    amount: -2_000,
    description: NEQUI,
    phone: "3001234567",
  },
  { date: "2026-07-20", amount: -500 },
];
const AUGUST: TestMovement[] = [
  { date: "2026-08-03", amount: -9_000 },
  { date: "2026-08-14", amount: -700 },
];
const OCTOBER: TestMovement[] = [{ date: "2026-10-02", amount: -7 }];
const LATER_IN_OCTOBER: TestMovement = { date: "2026-10-05", amount: -11 };

describe.skipIf(!testDatabase)("an account's coverage", () => {
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

  const newAccount = async (last4 = "8901") => {
    const userId = toUserId(await insertUser(owner.db));
    return { userId, accountId: await accountOf(userId, last4) };
  };

  const accountOf = (
    userId: ReturnType<typeof toUserId>,
    last4: string,
  ): Promise<string> =>
    withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4,
        currency: "COP",
      }),
    );

  type Account = Awaited<ReturnType<typeof newAccount>>;

  const save = async (
    { userId, accountId }: Account,
    statement: CategorizedStatement,
    balance: BalanceCheck,
  ) => {
    const saved = await withUserContext(app.db, userId, (ctx) =>
      saveStatement(ctx, { accountId, statement, balance }),
    );
    if (!saved.ok) throw new Error("Expected a save.");
    return saved.value.statementId;
  };

  // Each hidden movement with the counted one of its amount, as 10.1a
  // matches them.
  const matchAll = ({ userId, accountId }: Account) =>
    withUserContext(app.db, userId, async (ctx) => {
      const { hidden, counted } = await listMatchCandidates(ctx, accountId);
      await saveMatches(
        ctx,
        hidden.flatMap(({ id, amountMinor }) => {
          const twin = counted.find((m) => m.amountMinor === amountMinor);
          return twin ? [{ hiddenId: id, countedId: twin.id }] : [];
        }),
      );
    });

  const coverageOf = ({ userId }: Account) =>
    withUserContext(app.db, userId, listAccountCoverage);

  it("reads each month's files, the references they carried, and the quarterly statement's days", async () => {
    const account = await newAccount();
    const quarterly = await save(
      account,
      await preparedQuarterly([...JULY, ...AUGUST]),
      VERIFIED,
    );
    const july = await save(
      account,
      await preparedExport(JULY_EXPORT),
      UNCHECKED,
    );
    await matchAll(account);
    // Its own reference, which no quarterly statement took.
    const october = await save(
      account,
      await preparedExport([
        { date: "2026-10-02", amount: -7, phone: "3009876543" },
      ]),
      UNCHECKED,
    );

    const [coverage] = await coverageOf(account);

    expect(coverage).toEqual({
      accountId: account.accountId,
      months: [
        {
          month: "2026-07",
          files: [
            {
              statementId: quarterly,
              isQuarterly: true,
              period: { from: "2026-06-30", to: "2026-09-30" },
            },
            {
              statementId: july,
              isQuarterly: false,
              period: { from: "2026-07-10", to: "2026-07-20" },
            },
          ],
          references: 1,
        },
        {
          month: "2026-08",
          files: [
            {
              statementId: quarterly,
              isQuarterly: true,
              period: { from: "2026-06-30", to: "2026-09-30" },
            },
          ],
          references: 0,
        },
        {
          month: "2026-10",
          files: [
            {
              statementId: october,
              isQuarterly: false,
              period: { from: "2026-10-02", to: "2026-10-02" },
            },
          ],
          references: 0,
        },
      ],
      quarters: [
        {
          period: { from: "2026-06-30", to: "2026-09-30" },
          isChained: false,
        },
      ],
    });
  });

  it("leaves out a quarterly statement that doesn't reconcile, and a file whose movements another saved before", async () => {
    const account = await newAccount();
    await save(
      account,
      await preparedQuarterly(
        [...OCTOBER, { date: "2026-11-04", amount: -3 }],
        { from: "2026-09-30", to: "2026-12-31" },
      ),
      UNVERIFIED,
    );
    const october = await save(
      account,
      await preparedExport([...OCTOBER, LATER_IN_OCTOBER]),
      UNCHECKED,
    );
    // Another download of some of the same days: its movement was saved.
    await save(account, await preparedExport([LATER_IN_OCTOBER]), UNCHECKED);

    const [coverage] = await coverageOf(account);

    expect(coverage?.months).toEqual([
      {
        month: "2026-10",
        files: [
          {
            statementId: october,
            isQuarterly: false,
            period: { from: "2026-10-02", to: "2026-10-05" },
          },
        ],
        references: 0,
      },
    ]);
    expect(coverage?.quarters).toEqual([]);
  });

  it("chains a quarterly statement onto the one that ends the day it starts", async () => {
    const account = await newAccount();
    await save(
      account,
      await preparedQuarterly([{ date: "2026-05-04", amount: -2_000 }], {
        from: "2026-03-31",
        to: "2026-06-30",
      }),
      VERIFIED,
    );
    await save(
      account,
      await preparedQuarterly(JULY, { openingMinor: 98_000 }),
      VERIFIED,
    );

    const [coverage] = await coverageOf(account);

    expect(coverage?.quarters).toEqual([
      {
        period: { from: "2026-03-31", to: "2026-06-30" },
        isChained: false,
      },
      {
        period: { from: "2026-06-30", to: "2026-09-30" },
        isChained: true,
      },
    ]);
  });

  it("reads each account apart, and nothing of another user's", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(JULY), VERIFIED);
    const other = {
      ...account,
      accountId: await accountOf(account.userId, "2109"),
    };
    await save(other, await preparedExport(OCTOBER), UNCHECKED);
    const stranger = await newAccount();

    const coverage = await coverageOf(account);

    expect(
      coverage.map(({ accountId, months }) => [
        accountId,
        months.map(({ month }) => month),
      ]),
    ).toEqual(
      expect.arrayContaining([
        [account.accountId, ["2026-07"]],
        [other.accountId, ["2026-10"]],
      ]),
    );
    expect(coverage).toHaveLength(2);
    expect(await coverageOf(stranger)).toEqual([]);
  });

  it("counts every file the user keeps, of each kind", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(JULY), VERIFIED);
    await save(
      account,
      await preparedQuarterly(OCTOBER, {
        from: "2026-09-30",
        to: "2026-12-31",
      }),
      UNVERIFIED,
    );
    await save(account, await preparedExport(JULY_EXPORT), UNCHECKED);
    await save(account, await preparedExport(OCTOBER), UNCHECKED);
    await save(account, await preparedExport(AUGUST), UNCHECKED);
    const stranger = await newAccount();

    const files = (who: Account) =>
      withUserContext(app.db, who.userId, countUserFiles);

    expect(await files(account)).toEqual({ quarterly: 2, movements: 3 });
    expect(await files(stranger)).toEqual({ quarterly: 0, movements: 0 });
  });
});
