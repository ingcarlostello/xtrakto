import type { CategorizedStatement } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  type TestMovement,
  UNCHECKED,
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
import { listStatementMatches } from "./statement-matches.queries";
import { saveStatement } from "./statement.queries";
import type { BalanceCheck } from "./statement.types";

const INTEREST = "ABONO INTERESES AHORROS";
const NEQUI = "TRANSFERENCIAS A NEQUI";
const JULY_TO_SEPTEMBER = { from: "2026-06-30", to: "2026-09-30" };

// July of a verified quarter: a Nequi send, a purchase and interest.
const QUARTER: TestMovement[] = [
  { date: "2026-07-14", amount: 31, description: INTEREST },
  { date: "2026-07-15", amount: -2_000, description: NEQUI },
  { date: "2026-07-20", amount: -500 },
];
// The same movements as an export writes them: the send with its number,
// the interest on the day it was paid.
const EXPORT: TestMovement[] = [
  { date: "2026-07-15", amount: 31, description: INTEREST },
  {
    date: "2026-07-15",
    amount: -2_000,
    description: NEQUI,
    phone: "3001234567",
  },
  { date: "2026-07-20", amount: -500 },
];

describe.skipIf(!testDatabase)("statement matches", () => {
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

  const matchesOf = ({ userId }: Account, statementIds: readonly string[]) =>
    withUserContext(app.db, userId, (ctx) =>
      listStatementMatches(ctx, statementIds),
    );

  it("counts what a movements export matched, and the quarterly statement that verifies it", async () => {
    const account = await newAccount();
    const quarterId = await save(
      account,
      await preparedQuarterly(QUARTER),
      VERIFIED,
    );
    const exportId = await save(
      account,
      await preparedExport(EXPORT),
      UNCHECKED,
    );
    await matchAll(account);

    const matches = await matchesOf(account, [exportId, quarterId]);

    expect(matches.get(exportId)).toEqual({
      matched: 3,
      dayApart: 1,
      references: 1,
      verifiedBy: [JULY_TO_SEPTEMBER],
    });
    // The export's upload carried its reference over: it isn't the
    // quarterly statement's too.
    expect(matches.get(quarterId)).toEqual({
      matched: 3,
      dayApart: 1,
      references: 0,
      verifiedBy: [],
    });
  });

  it("gives the references to the quarterly statement saved after its export, which still verifies the export", async () => {
    const account = await newAccount();
    const exportId = await save(
      account,
      await preparedExport(EXPORT),
      UNCHECKED,
    );
    const quarterId = await save(
      account,
      await preparedQuarterly(QUARTER),
      VERIFIED,
    );
    await matchAll(account);

    const matches = await matchesOf(account, [exportId, quarterId]);

    expect(matches.get(exportId)).toMatchObject({
      references: 0,
      verifiedBy: [JULY_TO_SEPTEMBER],
    });
    expect(matches.get(quarterId)).toMatchObject({ matched: 3, references: 1 });
  });

  it("verifies no export with a day no quarterly statement covers", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(QUARTER), VERIFIED);
    const acrossQuarters = await save(
      account,
      await preparedExport([...EXPORT, { date: "2026-10-02", amount: -9 }]),
      UNCHECKED,
    );
    await matchAll(account);

    expect(
      (await matchesOf(account, [acrossQuarters])).get(acrossQuarters),
    ).toMatchObject({ matched: 3, verifiedBy: [] });
  });

  it("verifies no export with a movement left without a twin on its days", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(QUARTER), VERIFIED);
    const withoutTwin = await save(
      account,
      await preparedExport([{ date: "2026-08-03", amount: -7 }]),
      UNCHECKED,
    );

    expect((await matchesOf(account, [withoutTwin])).get(withoutTwin)).toEqual({
      matched: 0,
      dayApart: 0,
      references: 0,
      verifiedBy: [],
    });
  });

  it("verifies a repeated file, whose movements another file saved", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(QUARTER), VERIFIED);
    await save(account, await preparedExport(EXPORT), UNCHECKED);
    await matchAll(account);
    const repeated = await save(
      account,
      await preparedExport(EXPORT.slice(2)),
      UNCHECKED,
    );

    expect((await matchesOf(account, [repeated])).get(repeated)).toEqual({
      matched: 0,
      dayApart: 0,
      references: 0,
      verifiedBy: [JULY_TO_SEPTEMBER],
    });
  });

  it("verifies an export across two verified quarters, by both", async () => {
    const account = await newAccount();
    await save(account, await preparedQuarterly(QUARTER), VERIFIED);
    await save(
      account,
      await preparedQuarterly([{ date: "2026-10-02", amount: -9 }], {
        from: "2026-09-30",
        to: "2026-12-31",
      }),
      VERIFIED,
    );
    const exportId = await save(
      account,
      await preparedExport([...EXPORT, { date: "2026-10-02", amount: -9 }]),
      UNCHECKED,
    );
    await matchAll(account);

    expect(
      (await matchesOf(account, [exportId])).get(exportId)?.verifiedBy,
    ).toEqual([JULY_TO_SEPTEMBER, { from: "2026-09-30", to: "2026-12-31" }]);
  });

  it("reads nothing of another user's statements", async () => {
    const account = await newAccount();
    const exportId = await save(
      account,
      await preparedExport(EXPORT),
      UNCHECKED,
    );
    const stranger = await newAccount();

    expect((await matchesOf(stranger, [exportId])).get(exportId)).toEqual({
      matched: 0,
      dayApart: 0,
      references: 0,
      verifiedBy: [],
    });
  });
});
