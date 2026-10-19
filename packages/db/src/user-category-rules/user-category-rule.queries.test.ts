import type { UserCategoryRule } from "@xtrakto/core";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  UNCHECKED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { asAmount } from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { transactions } from "../transactions/transaction.schemas";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { listMovementAccounts } from "../transactions/transaction.queries";
import { findOrCreateUser } from "../users/user.queries";
import {
  countMovementsOfRule,
  listUserCategoryRules,
  saveUserCategoryRule,
} from "./user-category-rule.queries";

const MY_NEQUI = "3001234567";
const SOMEONE_ELSES_NEQUI = "3109876543";

// An export of October: key payments to a platform, Nequi transfers to two
// numbers and money back from one of them, and money back from the platform.
const OCTOBER = [
  {
    date: "2026-10-01",
    amount: -200_000,
    description: "PAGO LLAVE INVERSIONES XY",
  },
  {
    date: "2026-10-02",
    amount: -10_000,
    description: "PAGO LLAVE OTRA PLATAFORMA",
  },
  {
    date: "2026-10-03",
    amount: -90_000,
    description: "TRANSFERENCIAS A NEQUI",
    phone: MY_NEQUI,
  },
  {
    date: "2026-10-04",
    amount: -50_000,
    description: "TRANSFERENCIAS A NEQUI",
    phone: MY_NEQUI,
  },
  {
    date: "2026-10-05",
    amount: -30_000,
    description: "TRANSFERENCIAS A NEQUI",
    phone: SOMEONE_ELSES_NEQUI,
  },
  {
    date: "2026-10-06",
    amount: 20_000,
    description: "TRANSFERENCIA DESDE NEQUI",
    phone: MY_NEQUI,
  },
  {
    date: "2026-10-07",
    amount: 100_000,
    description: "PAGO LLAVE INVERSIONES XY",
  },
];

// The same platform in a quarterly statement, written another way.
const JULY = [
  {
    date: "2026-07-01",
    amount: -300_000,
    description: "Pago llave  inversiones xy",
  },
];

const KEY_PAYMENTS_ARE_TRANSFERS: UserCategoryRule = {
  target: "description",
  descriptionFolded: "PAGO LLAVE INVERSIONES XY",
  direction: "out",
  categoryId: "transfers_to_people",
};

describe.skipIf(!testDatabase)("user category rules", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const inContext = <T>(
    userId: UserId,
    run: (ctx: UserContext) => Promise<T>,
  ) => withUserContext(app.db, userId, run);

  // A new user with the export of October and the quarterly statement of July.
  const newUser = async (): Promise<UserId> => {
    const userId = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );
    await inContext(userId, async (ctx) => {
      const accountId = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId,
        balance: VERIFIED,
        statement: await preparedQuarterly(JULY),
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNCHECKED,
        statement: await preparedExport(OCTOBER),
      });
    });
    return userId;
  };

  const movementsOf = (userId: UserId) =>
    inContext(userId, ({ tx }) =>
      tx
        .select({
          description: transactions.descriptionNormalized,
          amountMinor: transactions.amountMinor,
          referenceHash: transactions.referenceHash,
          referenceLast4: transactions.referenceLast4,
          categoryId: transactions.categoryId,
          categorySource: transactions.categorySource,
          categoryRuleId: transactions.categoryRuleId,
          isPendingReview: transactions.isPendingReview,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(asc(transactions.date)),
    );

  it("keeps one rule per text and direction and one per reference, with the latest answer", async () => {
    const userId = await newUser();
    const myNequi = (await movementsOf(userId)).find(
      ({ referenceLast4 }) => referenceLast4 === "4567",
    )?.referenceHash;
    if (!myNequi) throw new Error("No Nequi reference saved.");

    const rules = await inContext(userId, async (ctx) => {
      await saveUserCategoryRule(ctx, {
        ...KEY_PAYMENTS_ARE_TRANSFERS,
        categoryId: "investment",
      });
      await saveUserCategoryRule(ctx, KEY_PAYMENTS_ARE_TRANSFERS);
      await saveUserCategoryRule(ctx, {
        ...KEY_PAYMENTS_ARE_TRANSFERS,
        direction: "in",
        categoryId: "own_account_transfer",
      });
      await saveUserCategoryRule(ctx, {
        target: "reference",
        referenceHash: myNequi,
        referenceLast4: "4567",
        categoryId: "own_account_transfer",
      });
      return listUserCategoryRules(ctx);
    });

    expect(rules).toHaveLength(3);
    expect(rules).toEqual(
      expect.arrayContaining([
        KEY_PAYMENTS_ARE_TRANSFERS,
        {
          ...KEY_PAYMENTS_ARE_TRANSFERS,
          direction: "in",
          categoryId: "own_account_transfer",
        },
        {
          target: "reference",
          referenceHash: myNequi,
          referenceLast4: "4567",
          categoryId: "own_account_transfer",
        },
      ]),
    );
  });

  it("gives a text rule's category to the user's movements with that text going that way, in any statement", async () => {
    const userId = await newUser();

    const changed = await inContext(userId, (ctx) =>
      saveUserCategoryRule(ctx, KEY_PAYMENTS_ARE_TRANSFERS),
    );
    const movements = await movementsOf(userId);

    expect(changed).toBe(2);
    expect(
      movements
        .filter(({ categorySource }) => categorySource === "user")
        .map(
          ({ description, categoryId, categoryRuleId, isPendingReview }) => ({
            description,
            categoryId,
            categoryRuleId,
            isPendingReview,
          }),
        ),
    ).toEqual([
      {
        description: "Pago llave  inversiones xy",
        categoryId: "transfers_to_people",
        categoryRuleId: "key_payment_saving",
        isPendingReview: false,
      },
      {
        description: "PAGO LLAVE INVERSIONES XY",
        categoryId: "transfers_to_people",
        categoryRuleId: "key_payment_saving",
        isPendingReview: false,
      },
    ]);
    // Money back from the platform goes the other way: no rule of the user's.
    expect(
      movements.find(({ amountMinor }) => amountMinor === 100_000),
    ).toMatchObject({ categoryId: null, categorySource: null });
  });

  it("gives a reference rule's category to the user's movements with that reference, both ways", async () => {
    const userId = await newUser();
    const before = await movementsOf(userId);
    const myNequi = before.find(
      ({ referenceLast4 }) => referenceLast4 === "4567",
    )?.referenceHash;
    if (!myNequi) throw new Error("No Nequi reference saved.");

    const changed = await inContext(userId, (ctx) =>
      saveUserCategoryRule(ctx, {
        target: "reference",
        referenceHash: myNequi,
        categoryId: "own_account_transfer",
      }),
    );
    const after = await movementsOf(userId);

    expect(changed).toBe(3);
    expect(
      after
        .filter(({ referenceHash }) => referenceHash === myNequi)
        .map(({ amountMinor, categoryId, categorySource, categoryRuleId }) => ({
          amountMinor,
          categoryId,
          categorySource,
          categoryRuleId,
        })),
    ).toEqual([
      {
        amountMinor: -90_000,
        categoryId: "own_account_transfer",
        categorySource: "user",
        categoryRuleId: "nequi_out_number",
      },
      {
        amountMinor: -50_000,
        categoryId: "own_account_transfer",
        categorySource: "user",
        categoryRuleId: "nequi_out_number",
      },
      {
        amountMinor: 20_000,
        categoryId: "own_account_transfer",
        categorySource: "user",
        categoryRuleId: "nequi_in",
      },
    ]);
    expect(
      after.find(({ referenceLast4 }) => referenceLast4 === "6543"),
    ).toMatchObject({
      categoryId: "transfers_to_people",
      categorySource: "rule",
    });
  });

  // A number the user says isn't theirs: a payment to someone holds for
  // money going out to it, while money coming in from it still asks.
  it("gives a payment to someone's reference rule only to the money going out", async () => {
    const userId = await newUser();
    const before = await movementsOf(userId);
    const number = before.find(
      ({ referenceLast4 }) => referenceLast4 === "4567",
    )?.referenceHash;
    if (!number) throw new Error("No Nequi reference saved.");

    const changed = await inContext(userId, (ctx) =>
      saveUserCategoryRule(ctx, {
        target: "reference",
        referenceHash: number,
        categoryId: "transfers_to_people",
      }),
    );
    const after = await movementsOf(userId);

    expect(changed).toBe(2);
    expect(
      after
        .filter(({ referenceHash }) => referenceHash === number)
        .map(({ amountMinor, categoryId, categorySource }) => ({
          amountMinor,
          categoryId,
          categorySource,
        })),
    ).toEqual([
      {
        amountMinor: -90_000,
        categoryId: "transfers_to_people",
        categorySource: "user",
      },
      {
        amountMinor: -50_000,
        categoryId: "transfers_to_people",
        categorySource: "user",
      },
      {
        amountMinor: 20_000,
        categoryId: "own_account_transfer",
        categorySource: "rule",
      },
    ]);
  });

  // A reference's rule comes before a text's (ADR 0025), also for the
  // movements already saved when the text's rule comes later.
  it("keeps what a number's rule says when a rule for its text comes later", async () => {
    const userId = await newUser();
    const myNequi = (await movementsOf(userId)).find(
      ({ referenceLast4 }) => referenceLast4 === "4567",
    )?.referenceHash;
    if (!myNequi) throw new Error("No Nequi reference saved.");

    const changed = await inContext(userId, async (ctx) => {
      await saveUserCategoryRule(ctx, {
        target: "reference",
        referenceHash: myNequi,
        categoryId: "own_account_transfer",
      });
      return saveUserCategoryRule(ctx, {
        target: "description",
        descriptionFolded: "TRANSFERENCIAS A NEQUI",
        direction: "out",
        categoryId: "transfers_to_people",
      });
    });
    const sends = (await movementsOf(userId)).filter(
      ({ description }) => description === "TRANSFERENCIAS A NEQUI",
    );

    expect(changed).toBe(1);
    expect(
      sends.map(({ referenceLast4, categoryId }) => [
        referenceLast4,
        categoryId,
      ]),
    ).toEqual([
      ["4567", "own_account_transfer"],
      ["4567", "own_account_transfer"],
      ["6543", "transfers_to_people"],
    ]);
  });

  it("keeps a number marked as someone else's when a rule for its text comes later", async () => {
    const userId = await newUser();
    const theirs = (await movementsOf(userId)).find(
      ({ referenceLast4 }) => referenceLast4 === "6543",
    )?.referenceHash;
    if (!theirs) throw new Error("No Nequi reference saved.");

    const changed = await inContext(userId, async (ctx) => {
      await saveUserCategoryRule(ctx, {
        target: "reference",
        referenceHash: theirs,
        categoryId: "transfers_to_people",
      });
      return saveUserCategoryRule(ctx, {
        target: "description",
        descriptionFolded: "TRANSFERENCIAS A NEQUI",
        direction: "out",
        categoryId: "investment",
      });
    });
    const sends = (await movementsOf(userId)).filter(
      ({ description }) => description === "TRANSFERENCIAS A NEQUI",
    );

    expect(changed).toBe(2);
    expect(
      sends.map(({ referenceLast4, categoryId }) => [
        referenceLast4,
        categoryId,
      ]),
    ).toEqual([
      ["4567", "investment"],
      ["4567", "investment"],
      ["6543", "transfers_to_people"],
    ]);
  });

  it("counts the movements a text rule would change besides one, leaving what a number's rule says", async () => {
    const userId = await newUser();
    const before = await movementsOf(userId);
    const myNequi = before.find(
      ({ referenceLast4 }) => referenceLast4 === "4567",
    )?.referenceHash;
    const idOf = async (amountMinor: number) => {
      const [row] = await inContext(userId, ({ tx }) =>
        tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(eq(transactions.amountMinor, asAmount(amountMinor))),
      );
      if (!row) throw new Error(`No movement of ${amountMinor}.`);
      return row.id;
    };
    if (!myNequi) throw new Error("No Nequi reference saved.");

    const counts = await inContext(userId, async (ctx) => {
      // July's payment again in an export, which the verified quarterly
      // statement hides: it counts nowhere (ADR 0018).
      const [account] = await listMovementAccounts(ctx);
      if (!account) throw new Error("No account.");
      await saveStatement(ctx, {
        accountId: account.id,
        balance: UNCHECKED,
        statement: await preparedExport([
          {
            date: "2026-07-01",
            amount: -300_000,
            description: "PAGO LLAVE INVERSIONES XY",
          },
        ]),
      });
      // The October key payment and July's, written another way.
      const keyPayments = await countMovementsOfRule(
        ctx,
        KEY_PAYMENTS_ARE_TRANSFERS,
        await idOf(-200_000),
      );
      await saveUserCategoryRule(ctx, {
        target: "reference",
        referenceHash: myNequi,
        categoryId: "own_account_transfer",
      });
      // The sends to ••4567 stay the user's own: none besides ••6543's.
      const sends = await countMovementsOfRule(
        ctx,
        {
          target: "description",
          descriptionFolded: "TRANSFERENCIAS A NEQUI",
          direction: "out",
          categoryId: "transfers_to_people",
        },
        await idOf(-30_000),
      );
      return { keyPayments, sends };
    });

    expect(counts).toEqual({ keyPayments: 1, sends: 0 });
  });

  it("changes nothing of another user's, who can't read the rule", async () => {
    const userId = await newUser();
    const otherUserId = await newUser();
    const before = await movementsOf(otherUserId);

    await inContext(userId, (ctx) =>
      saveUserCategoryRule(ctx, KEY_PAYMENTS_ARE_TRANSFERS),
    );

    expect(await movementsOf(otherUserId)).toEqual(before);
    expect(await inContext(otherUserId, listUserCategoryRules)).toEqual([]);
  });

  it("saves a rule no movement holds yet, for the next statements", async () => {
    const userId = await newUser();
    const rule: UserCategoryRule = {
      target: "description",
      descriptionFolded: "PAGO PSE EMPRESA NUEVA",
      direction: "out",
      categoryId: "utilities",
    };

    const changed = await inContext(userId, (ctx) =>
      saveUserCategoryRule(ctx, rule),
    );

    expect(changed).toBe(0);
    expect(await inContext(userId, listUserCategoryRules)).toEqual([rule]);
  });
});
