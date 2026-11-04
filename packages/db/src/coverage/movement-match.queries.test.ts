import type { CategorizedStatement, MatchedUpdate } from "@xtrakto/core";
import { and, eq, isNotNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  type TestMovement,
  UNCHECKED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import {
  asLocalDate,
  insertUser,
  pgErrorCode,
  sha256Hex,
} from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import type { BalanceCheck } from "../statements/statement.types";
import { saveStatement } from "../statements/statement.queries";
import { transactions } from "../transactions/transaction.schemas";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { deleteAllUserData } from "../users/user.queries";
import {
  listMatchCandidates,
  type MatchCandidates,
  saveMatches,
} from "./movement-match.queries";

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

const NEQUI = "TRANSFERENCIAS A NEQUI";
const JULY: TestMovement[] = [
  { date: "2026-07-15", amount: -2_000, description: NEQUI },
  { date: "2026-07-20", amount: -500 },
];
// July of the quarter, as the export writes it: with the send's number.
const JULY_EXPORT: TestMovement[] = [
  {
    date: "2026-07-15",
    amount: -2_000,
    description: NEQUI,
    phone: "3001234567",
  },
  { date: "2026-07-20", amount: -500 },
];

const UPDATE: MatchedUpdate = {
  referenceHash: sha256Hex("3001234567"),
  referenceLast4: "4567",
  referenceKind: "phone",
  categoryId: "transfers_to_people",
  categorySource: "rule",
  categoryRuleId: "nequi_out_number",
  isPendingReview: true,
};

describe.skipIf(!testDatabase)("movement matches", () => {
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

  const save = async (
    { userId, accountId }: { userId: UserId; accountId: string },
    statement: CategorizedStatement,
    balance: BalanceCheck,
  ) => {
    const saved = await withUserContext(app.db, userId, (ctx) =>
      saveStatement(ctx, { accountId, statement, balance }),
    );
    if (!saved.ok) throw new Error("Expected a save.");
    return saved.value.statementId;
  };

  // A verified July to September and July's export, saved in that order.
  const quarterAndExport = async () => {
    const account = await newAccount();
    const quarterId = await save(
      account,
      await preparedQuarterly(JULY),
      VERIFIED,
    );
    await save(account, await preparedExport(JULY_EXPORT), UNCHECKED);
    return { ...account, quarterId };
  };

  const candidatesOf = ({
    userId,
    accountId,
  }: {
    userId: UserId;
    accountId: string;
  }) =>
    withUserContext(app.db, userId, (ctx) =>
      listMatchCandidates(ctx, accountId),
    );

  // Each hidden movement with the counted one of its day and amount.
  const pairsOf = ({ hidden, counted }: MatchCandidates) =>
    hidden.map((movement) => {
      const twin = counted.find(
        ({ date, amountMinor }) =>
          date === movement.date && amountMinor === movement.amountMinor,
      );
      return { hiddenId: movement.id, countedId: twin?.id ?? "" };
    });

  const rowOf = (id: string) =>
    owner.db
      .select({
        matchedTransactionId: transactions.matchedTransactionId,
        referenceHash: transactions.referenceHash,
        referenceLast4: transactions.referenceLast4,
        referenceKind: transactions.referenceKind,
        categoryId: transactions.categoryId,
        categorySource: transactions.categorySource,
        categoryRuleId: transactions.categoryRuleId,
        isPendingReview: transactions.isPendingReview,
      })
      .from(transactions)
      .where(eq(transactions.id, id))
      .then(([row]) => row);

  it("lists an account's hidden movements and the counted ones of the statement hiding them", async () => {
    const { userId, accountId, quarterId } = await quarterAndExport();

    const { hidden, counted } = await candidatesOf({ userId, accountId });

    expect(hidden).toHaveLength(2);
    expect(hidden.every((m) => m.coveredByStatementId === quarterId)).toBe(
      true,
    );
    expect(hidden.find((m) => m.amountMinor === -2_000)).toMatchObject({
      referenceKind: "phone",
      categoryRuleId: "nequi_out_number",
    });
    expect(counted.map(({ statementId }) => statementId)).toEqual([
      quarterId,
      quarterId,
    ]);
    expect(counted.find((m) => m.amountMinor === -2_000)).toMatchObject({
      referenceHash: null,
      categoryRuleId: "nequi_out",
    });
  });

  it("lists nothing for an account without hidden movements, nor another user's", async () => {
    const account = await quarterAndExport();
    const stranger = await newAccount();

    expect(await candidatesOf(stranger)).toEqual({ hidden: [], counted: [] });
    expect(
      await candidatesOf({
        userId: stranger.userId,
        accountId: account.accountId,
      }),
    ).toEqual({ hidden: [], counted: [] });
  });

  it("links each hidden movement to its twin, which takes its update, and lists neither again", async () => {
    const account = await quarterAndExport();
    const [send, purchase] = pairsOf(await candidatesOf(account));

    await withUserContext(app.db, account.userId, (ctx) =>
      saveMatches(ctx, [
        {
          hiddenId: send?.hiddenId ?? "",
          countedId: send?.countedId ?? "",
          update: UPDATE,
        },
        {
          hiddenId: purchase?.hiddenId ?? "",
          countedId: purchase?.countedId ?? "",
        },
      ]),
    );

    expect(await rowOf(send?.hiddenId ?? "")).toMatchObject({
      matchedTransactionId: send?.countedId,
    });
    expect(await rowOf(send?.countedId ?? "")).toEqual({
      matchedTransactionId: null,
      ...UPDATE,
    });
    expect(await rowOf(purchase?.countedId ?? "")).toMatchObject({
      matchedTransactionId: null,
      referenceHash: null,
    });
    expect(await rowOf(purchase?.hiddenId ?? "")).toMatchObject({
      matchedTransactionId: purchase?.countedId,
    });
    expect(await candidatesOf(account)).toEqual({ hidden: [], counted: [] });
  });

  it("never links a movement no statement hides", async () => {
    const account = await quarterAndExport();
    const { counted } = await candidatesOf(account);
    const [first, second] = counted;

    expect(
      await pgErrorCode(
        withUserContext(app.db, account.userId, (ctx) =>
          saveMatches(ctx, [
            { hiddenId: first?.id ?? "", countedId: second?.id ?? "" },
          ]),
        ),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it("never links a hidden movement to one outside the statement hiding it", async () => {
    const account = await quarterAndExport();
    await save(
      account,
      await preparedQuarterly(
        [{ date: "2026-10-05", amount: -2_000, description: NEQUI }],
        {
          from: "2026-09-30",
          to: "2026-12-31",
        },
      ),
      VERIFIED,
    );
    const { hidden } = await candidatesOf(account);
    const [october] = await owner.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, account.accountId),
          eq(transactions.date, asLocalDate("2026-10-05")),
        ),
      );

    expect(
      await pgErrorCode(
        withUserContext(app.db, account.userId, (ctx) =>
          saveMatches(ctx, [
            { hiddenId: hidden[0]?.id ?? "", countedId: october?.id ?? "" },
          ]),
        ),
      ),
    ).toBe(FOREIGN_KEY_VIOLATION);
  });

  it("links one hidden movement at most to each that counts", async () => {
    const account = await quarterAndExport();
    const { hidden, counted } = await candidatesOf(account);
    const twin = counted[0]?.id ?? "";

    expect(
      await pgErrorCode(
        withUserContext(app.db, account.userId, (ctx) =>
          saveMatches(
            ctx,
            hidden.map(({ id }) => ({ hiddenId: id, countedId: twin })),
          ),
        ),
      ),
    ).toBe(UNIQUE_VIOLATION);
  });

  it("deletes a user's matched movements with the rest of their data", async () => {
    const account = await quarterAndExport();
    const pairs = pairsOf(await candidatesOf(account));
    await withUserContext(app.db, account.userId, (ctx) =>
      saveMatches(ctx, pairs),
    );

    expect(
      await withUserContext(app.db, account.userId, deleteAllUserData),
    ).toBe(true);
    expect(
      await owner.db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, account.userId),
            isNotNull(transactions.matchedTransactionId),
          ),
        ),
    ).toEqual([]);
  });
});
