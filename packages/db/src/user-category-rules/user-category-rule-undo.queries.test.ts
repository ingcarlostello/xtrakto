import type { UserCategoryRule } from "@xtrakto/core";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { preparedExport, UNCHECKED } from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { transactions } from "../transactions/transaction.schemas";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import { deleteUserCategoryRule } from "./user-category-rule-undo.queries";
import {
  listUserCategoryRules,
  saveUserCategoryRule,
} from "./user-category-rule.queries";

// October's sends to the user's Nequi and to someone else's, money back
// from the user's, all guesses to review.
const OCTOBER = [
  {
    date: "2026-10-03",
    amount: -90_000,
    description: "TRANSFERENCIAS A NEQUI",
    phone: "3001234567",
  },
  {
    date: "2026-10-05",
    amount: -30_000,
    description: "TRANSFERENCIAS A NEQUI",
    phone: "3109876543",
  },
  {
    date: "2026-10-06",
    amount: 20_000,
    description: "TRANSFERENCIA DESDE NEQUI",
    phone: "3001234567",
  },
];

const SENDS_ARE_INVESTMENTS: UserCategoryRule = {
  target: "description",
  descriptionFolded: "TRANSFERENCIAS A NEQUI",
  direction: "out",
  categoryId: "investment",
};

describe.skipIf(!testDatabase)("undoing a user's rule", () => {
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

  // A new user with October's export, and their Nequi number's rule.
  const newUser = async () => {
    const userId = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );
    const myNequi = await inContext(userId, async (ctx) => {
      const accountId = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNCHECKED,
        statement: await preparedExport(OCTOBER),
      });
      const [mine] = await ctx.tx
        .select({ hash: transactions.referenceHash })
        .from(transactions)
        .where(eq(transactions.referenceLast4, "4567"));
      return mine?.hash;
    });
    if (!myNequi) throw new Error("No Nequi reference saved.");
    const mine: UserCategoryRule = {
      target: "reference",
      referenceHash: myNequi,
      referenceLast4: "4567",
      categoryId: "own_account_transfer",
    };
    return { userId, mine };
  };

  // Each movement's digits, category, who gave it and whether it waits.
  const categoriesOf = (userId: UserId) =>
    inContext(userId, ({ tx }) =>
      tx
        .select({
          last4: transactions.referenceLast4,
          amountMinor: transactions.amountMinor,
          categoryId: transactions.categoryId,
          categorySource: transactions.categorySource,
          isPendingReview: transactions.isPendingReview,
        })
        .from(transactions)
        .orderBy(asc(transactions.date)),
    );

  it("undoes a number marked as the user's: its movements go back to the table's guesses", async () => {
    const { userId, mine } = await newUser();

    const changed = await inContext(userId, async (ctx) => {
      await saveUserCategoryRule(ctx, mine);
      return deleteUserCategoryRule(ctx, mine);
    });

    expect(changed).toBe(2);
    expect(await categoriesOf(userId)).toEqual([
      {
        last4: "4567",
        amountMinor: -90_000,
        categoryId: "transfers_to_people",
        categorySource: "rule",
        isPendingReview: true,
      },
      {
        last4: "6543",
        amountMinor: -30_000,
        categoryId: "transfers_to_people",
        categorySource: "rule",
        isPendingReview: true,
      },
      {
        last4: "4567",
        amountMinor: 20_000,
        categoryId: "own_account_transfer",
        categorySource: "rule",
        isPendingReview: true,
      },
    ]);
    expect(await inContext(userId, listUserCategoryRules)).toEqual([]);
  });

  it("gives a number's movements the user's rule for their text once its rule is undone", async () => {
    const { userId, mine } = await newUser();

    await inContext(userId, async (ctx) => {
      await saveUserCategoryRule(ctx, SENDS_ARE_INVESTMENTS);
      await saveUserCategoryRule(ctx, mine);
      await deleteUserCategoryRule(ctx, mine);
    });

    expect(
      (await categoriesOf(userId)).map(({ categoryId, categorySource }) => [
        categoryId,
        categorySource,
      ]),
    ).toEqual([
      ["investment", "user"],
      ["investment", "user"],
      ["own_account_transfer", "rule"],
    ]);
  });

  it("undoes a text's rule, leaving what a number's rule says", async () => {
    const { userId, mine } = await newUser();

    const changed = await inContext(userId, async (ctx) => {
      await saveUserCategoryRule(ctx, mine);
      await saveUserCategoryRule(ctx, SENDS_ARE_INVESTMENTS);
      return deleteUserCategoryRule(ctx, SENDS_ARE_INVESTMENTS);
    });

    expect(changed).toBe(1);
    expect(
      (await categoriesOf(userId)).map(({ last4, categoryId }) => [
        last4,
        categoryId,
      ]),
    ).toEqual([
      ["4567", "own_account_transfer"],
      ["6543", "transfers_to_people"],
      ["4567", "own_account_transfer"],
    ]);
    expect(await inContext(userId, listUserCategoryRules)).toEqual([mine]);
  });

  it("undoes nothing of another user's", async () => {
    const owner = await newUser();
    const intruder = await newUser();
    await inContext(owner.userId, (ctx) =>
      saveUserCategoryRule(ctx, SENDS_ARE_INVESTMENTS),
    );
    const before = await categoriesOf(owner.userId);

    await inContext(intruder.userId, (ctx) =>
      deleteUserCategoryRule(ctx, SENDS_ARE_INVESTMENTS),
    );

    expect(await categoriesOf(owner.userId)).toEqual(before);
    expect(await inContext(owner.userId, listUserCategoryRules)).toEqual([
      SENDS_ARE_INVESTMENTS,
    ]);
  });
});
