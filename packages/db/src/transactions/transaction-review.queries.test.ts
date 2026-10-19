import { periodSchema } from "@xtrakto/core";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  UNCHECKED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  dismissReview,
  listReviewMovements,
  setUserCategory,
} from "./transaction-review.queries";
import { transactions } from "./transaction.schemas";

const JULY_TO_SEPTEMBER = periodSchema.parse({
  from: "2026-07-01",
  to: "2026-09-30",
});

// A quarter with two key payments and a movement without description to
// review, and a Nequi transfer the rules are sure of.
const QUARTER = [
  {
    date: "2026-07-01",
    amount: -200_000,
    description: "PAGO LLAVE INVERSIONES XY",
  },
  {
    date: "2026-07-02",
    amount: -10_000,
    description: "TRANSFERENCIAS A NEQUI",
  },
  {
    date: "2026-08-03",
    amount: -50_000,
    description: "PAGO LLAVE Maria Lopez",
  },
  { date: "2026-09-04", amount: -22_000, description: "0" },
];

const HIDDEN = [
  {
    date: "2026-08-10",
    amount: -70_000,
    description: "PAGO LLAVE Maria Lopez",
  },
];

// The same platform in October, outside the quarter.
const OCTOBER = [
  {
    date: "2026-10-01",
    amount: -300_000,
    description: "PAGO LLAVE INVERSIONES XY",
  },
];

describe.skipIf(!testDatabase)("review movements", () => {
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

  // A user with the quarter and October on account 8901, and the quarter's
  // key payment again on another account.
  const newUser = async () => {
    const userId = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );
    const accountId = await inContext(userId, async (ctx) => {
      const id = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
      });
      const otherId = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "1234",
        currency: "COP",
      });
      await saveStatement(ctx, {
        accountId: id,
        balance: VERIFIED,
        statement: await preparedQuarterly(QUARTER),
      });
      await saveStatement(ctx, {
        accountId: id,
        balance: UNCHECKED,
        statement: await preparedExport(OCTOBER),
      });
      // An export on the quarter's days, which the verified statement hides:
      // it counts nowhere, so the review never asks about it.
      await saveStatement(ctx, {
        accountId: id,
        balance: UNCHECKED,
        statement: await preparedExport(HIDDEN),
      });
      await saveStatement(ctx, {
        accountId: otherId,
        balance: UNCHECKED,
        statement: await preparedExport(QUARTER.slice(0, 1)),
      });
      return id;
    });
    return { userId, accountId };
  };

  const quarterOf = (userId: UserId, accountId: string) =>
    inContext(userId, (ctx) =>
      listReviewMovements(ctx, { accountId, period: JULY_TO_SEPTEMBER }),
    );

  const movementOf = (userId: UserId, id: string) =>
    inContext(userId, async ({ tx }) => {
      const [row] = await tx
        .select({
          categoryId: transactions.categoryId,
          categorySource: transactions.categorySource,
          categoryRuleId: transactions.categoryRuleId,
          isPendingReview: transactions.isPendingReview,
        })
        .from(transactions)
        .where(eq(transactions.id, id));
      return row;
    });

  it("lists the period's movements of the account that count and wait for review, the oldest first", async () => {
    const { userId, accountId } = await newUser();

    const movements = await quarterOf(userId, accountId);

    expect(
      movements.map(({ ruleId, descriptionRaw, amountMinor }) => ({
        ruleId,
        descriptionRaw,
        amountMinor,
      })),
    ).toEqual([
      {
        ruleId: "key_payment_saving",
        descriptionRaw: "PAGO LLAVE INVERSIONES XY",
        amountMinor: -200_000,
      },
      {
        ruleId: "key_payment",
        descriptionRaw: "PAGO LLAVE Maria Lopez",
        amountMinor: -50_000,
      },
      {
        ruleId: "no_description_out",
        descriptionRaw: "0",
        amountMinor: -22_000,
      },
    ]);
  });

  it("keeps what some rules guessed", async () => {
    const { userId, accountId } = await newUser();

    const movements = await inContext(userId, (ctx) =>
      listReviewMovements(ctx, {
        accountId,
        period: JULY_TO_SEPTEMBER,
        ruleIds: ["key_payment", "no_description_out"],
      }),
    );

    expect(movements.map(({ ruleId }) => ruleId)).toEqual([
      "key_payment",
      "no_description_out",
    ]);
  });

  it("gives movements the user's category, decided and keeping the rule that guessed", async () => {
    const { userId, accountId } = await newUser();
    const [, , withoutText] = await quarterOf(userId, accountId);
    if (!withoutText) throw new Error("No movement to review.");

    const changed = await inContext(userId, (ctx) =>
      setUserCategory(ctx, {
        movementIds: [withoutText.id],
        categoryId: "own_account_transfer",
      }),
    );

    expect(changed).toBe(1);
    expect(await movementOf(userId, withoutText.id)).toEqual({
      categoryId: "own_account_transfer",
      categorySource: "user",
      categoryRuleId: "no_description_out",
      isPendingReview: false,
    });
    expect(await quarterOf(userId, accountId)).toHaveLength(2);
  });

  it("takes movements out of the review, keeping their best guess", async () => {
    const { userId, accountId } = await newUser();
    const [, keyPayment] = await quarterOf(userId, accountId);
    if (!keyPayment) throw new Error("No movement to review.");

    const dismissed = await inContext(userId, (ctx) =>
      dismissReview(ctx, [keyPayment.id]),
    );

    expect(dismissed).toBe(1);
    expect(await movementOf(userId, keyPayment.id)).toEqual({
      categoryId: "transfers_to_people",
      categorySource: "rule",
      categoryRuleId: "key_payment",
      isPendingReview: false,
    });
    expect(await quarterOf(userId, accountId)).toHaveLength(2);
  });

  it("never changes another user's movements", async () => {
    const owner = await newUser();
    const other = await newUser();
    const ids = (await quarterOf(owner.userId, owner.accountId)).map(
      ({ id }) => id,
    );

    const changed = await inContext(other.userId, async (ctx) => [
      await setUserCategory(ctx, { movementIds: ids, categoryId: "groceries" }),
      await dismissReview(ctx, ids),
    ]);

    expect(changed).toEqual([0, 0]);
    expect(await quarterOf(owner.userId, owner.accountId)).toHaveLength(3);
  });
});
