import type { UserCategoryRule } from "@xtrakto/core";
import { and, asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  type TestMovement,
  UNCHECKED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { listTransactions } from "../transactions/transaction.queries";
import { transactions } from "../transactions/transaction.schemas";
import { deleteUserCategoryRule } from "../user-category-rules/user-category-rule-undo.queries";
import { saveUserCategoryRule } from "../user-category-rules/user-category-rule.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import { listLlmWaitingTexts, saveLlmCategories } from "./llm-category.queries";

// August's movements: two purchases at a drugstore no rule knows, money
// in no rule knows, a supermarket the table knows, a key payment and the
// bank's `0`, both guesses to review.
const AUGUST: readonly TestMovement[] = [
  { date: "2026-08-03", amount: -50_000, description: "COMPRA EN AUDIFARMA" },
  {
    date: "2026-08-04",
    amount: 30_000,
    description: "ABONO DEVOLUCION COMPRA",
  },
  { date: "2026-08-05", amount: -80_000, description: "COMPRA EN EXITO" },
  { date: "2026-08-06", amount: -40_000, description: "PAGO LLAVE ALGUIEN" },
  { date: "2026-08-07", amount: -9_000, description: "0" },
  { date: "2026-08-20", amount: -20_000, description: "COMPRA EN AUDIFARMA" },
];

// September's: the drugstore again, and money in with the same text.
const SEPTEMBER: readonly TestMovement[] = [
  { date: "2026-09-02", amount: -35_000, description: "COMPRA EN AUDIFARMA" },
  { date: "2026-09-03", amount: 10_000, description: "COMPRA EN AUDIFARMA" },
];

const DRUGSTORE = {
  descriptionNormalized: "COMPRA EN AUDIFARMA",
  direction: "out",
} as const;

// What the LLM says a drugstore's purchase is, in plain words (8.6b).
const DRUGSTORE_TITLE = "Compra en una droguería";

const DRUGSTORE_IS_SHOPPING: UserCategoryRule = {
  target: "description",
  descriptionFolded: "COMPRA EN AUDIFARMA",
  direction: "out",
  categoryId: "shopping",
};

const REFUND = {
  descriptionNormalized: "ABONO DEVOLUCION COMPRA",
  direction: "in",
} as const;

const REFUNDS_ARE_INCOME: UserCategoryRule = {
  target: "description",
  descriptionFolded: "ABONO DEVOLUCION COMPRA",
  direction: "in",
  categoryId: "income_transfer",
};

describe.skipIf(!testDatabase)("the movements the LLM categorizes", () => {
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

  const accountOf = (ctx: UserContext) =>
    resolveIdentifiedAccount(ctx, {
      bankId: "bancolombia",
      accountType: "savings",
      last4: "8901",
      currency: "COP",
    });

  // A new user with one export a month on account 8901.
  const newUser = async (...months: (readonly TestMovement[])[]) => {
    const userId = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );
    await inContext(userId, async (ctx) => {
      const accountId = await accountOf(ctx);
      for (const movements of months)
        await saveStatement(ctx, {
          accountId,
          balance: UNCHECKED,
          statement: await preparedExport(movements),
        });
    });
    return userId;
  };

  const waitingOf = (userId: UserId) =>
    inContext(userId, async (ctx) =>
      (await listLlmWaitingTexts(ctx)).sort((a, b) =>
        `${a.descriptionNormalized} ${a.direction}`.localeCompare(
          `${b.descriptionNormalized} ${b.direction}`,
        ),
      ),
    );

  // The drugstore's movements going out: category, who gave it, the LLM's
  // answer kept, and the table's rule kept.
  const drugstoreOf = (userId: UserId) =>
    inContext(userId, ({ tx }) =>
      tx
        .select({
          categoryId: transactions.categoryId,
          categorySource: transactions.categorySource,
          llmCategoryId: transactions.llmCategoryId,
          llmTitle: transactions.llmTitle,
          categoryRuleId: transactions.categoryRuleId,
          isPendingReview: transactions.isPendingReview,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.descriptionNormalized, "COMPRA EN AUDIFARMA"),
            eq(transactions.categoryRuleId, "unknown_merchant"),
          ),
        )
        .orderBy(asc(transactions.date)),
    );

  it("lists each text that waits once, with its money's direction, in every statement", async () => {
    const userId = await newUser(AUGUST, SEPTEMBER);

    expect(await waitingOf(userId)).toEqual([
      { descriptionNormalized: "ABONO DEVOLUCION COMPRA", direction: "in" },
      { descriptionNormalized: "COMPRA EN AUDIFARMA", direction: "in" },
      DRUGSTORE,
    ]);
  });

  it("gives an answer to every movement that waits with its text and direction", async () => {
    const userId = await newUser(AUGUST, SEPTEMBER);

    const changed = await inContext(userId, (ctx) =>
      saveLlmCategories(ctx, [
        { ...DRUGSTORE, categoryId: "health", title: DRUGSTORE_TITLE },
      ]),
    );

    expect(changed).toBe(3);
    expect(await drugstoreOf(userId)).toEqual(
      Array.from({ length: 3 }, () => ({
        categoryId: "health",
        categorySource: "llm",
        llmCategoryId: "health",
        llmTitle: DRUGSTORE_TITLE,
        categoryRuleId: "unknown_merchant",
        isPendingReview: false,
      })),
    );
    expect(await waitingOf(userId)).toEqual([
      { descriptionNormalized: "ABONO DEVOLUCION COMPRA", direction: "in" },
      { descriptionNormalized: "COMPRA EN AUDIFARMA", direction: "in" },
    ]);
  });

  it("gives each text its own title, though their category is the same", async () => {
    const userId = await newUser(AUGUST, [
      {
        date: "2026-09-10",
        amount: -60_000,
        description: "COMPRA EN NATURISTA SOL",
      },
    ]);
    const NATURIST_TITLE = "Compra en una tienda naturista";

    await inContext(userId, (ctx) =>
      saveLlmCategories(ctx, [
        { ...DRUGSTORE, categoryId: "health", title: DRUGSTORE_TITLE },
        {
          descriptionNormalized: "COMPRA EN NATURISTA SOL",
          direction: "out",
          categoryId: "health",
          title: NATURIST_TITLE,
        },
      ]),
    );
    const titles = await inContext(userId, ({ tx }) =>
      tx
        .selectDistinct({
          description: transactions.descriptionNormalized,
          llmTitle: transactions.llmTitle,
        })
        .from(transactions)
        .where(eq(transactions.llmCategoryId, "health"))
        .orderBy(asc(transactions.descriptionNormalized)),
    );

    expect(titles).toEqual([
      { description: "COMPRA EN AUDIFARMA", llmTitle: DRUGSTORE_TITLE },
      { description: "COMPRA EN NATURISTA SOL", llmTitle: NATURIST_TITLE },
    ]);
  });

  it("never changes a guess to review, nor a category a rule knows", async () => {
    const userId = await newUser(AUGUST);

    const changed = await inContext(userId, (ctx) =>
      saveLlmCategories(
        ctx,
        [
          { ...DRUGSTORE, descriptionNormalized: "PAGO LLAVE ALGUIEN" },
          { ...DRUGSTORE, descriptionNormalized: "0" },
          { ...DRUGSTORE, descriptionNormalized: "COMPRA EN EXITO" },
        ].map((text) => ({
          ...text,
          categoryId: "shopping" as const,
          title: null,
        })),
      ),
    );

    expect(changed).toBe(0);
  });

  it("leaves the user's category first, and its texts no longer wait", async () => {
    const userId = await newUser(AUGUST);

    const changed = await inContext(userId, async (ctx) => {
      await saveUserCategoryRule(ctx, DRUGSTORE_IS_SHOPPING);
      // Money in no rule knew, so the user's category keeps no rule.
      await saveUserCategoryRule(ctx, REFUNDS_ARE_INCOME);
      return saveLlmCategories(ctx, [
        { ...DRUGSTORE, categoryId: "health", title: DRUGSTORE_TITLE },
        { ...REFUND, categoryId: "refund", title: null },
      ]);
    });

    expect(changed).toBe(0);
    expect((await drugstoreOf(userId)).map((row) => row.categoryId)).toEqual([
      "shopping",
      "shopping",
    ]);
    expect(await waitingOf(userId)).toEqual([]);
  });

  it("keeps the LLM's answer under the user's rule, and undoing the rule gives it back", async () => {
    const userId = await newUser(AUGUST);

    const undone = await inContext(userId, async (ctx) => {
      await saveLlmCategories(ctx, [
        { ...DRUGSTORE, categoryId: "health", title: DRUGSTORE_TITLE },
      ]);
      await saveUserCategoryRule(ctx, DRUGSTORE_IS_SHOPPING);
      return deleteUserCategoryRule(ctx, DRUGSTORE_IS_SHOPPING);
    });

    expect(undone).toBe(2);
    expect(await drugstoreOf(userId)).toEqual(
      Array.from({ length: 2 }, () => ({
        categoryId: "health",
        categorySource: "llm",
        llmCategoryId: "health",
        llmTitle: DRUGSTORE_TITLE,
        categoryRuleId: "unknown_merchant",
        isPendingReview: false,
      })),
    );
  });

  it("lists the LLM's title while the category is its answer, and none once the user gave another", async () => {
    const userId = await newUser(AUGUST);
    const listed = () =>
      inContext(userId, async (ctx) => {
        const accountId = await accountOf(ctx);
        const { items } = await listTransactions(ctx, { accountId, offset: 0 });
        return items
          .filter((item) => item.descriptionRaw === "COMPRA EN AUDIFARMA")
          .map((item) => item.llmTitle);
      });

    await inContext(userId, (ctx) =>
      saveLlmCategories(ctx, [
        { ...DRUGSTORE, categoryId: "health", title: DRUGSTORE_TITLE },
      ]),
    );
    const answered = await listed();
    await inContext(userId, (ctx) =>
      saveUserCategoryRule(ctx, DRUGSTORE_IS_SHOPPING),
    );

    expect(answered).toEqual([DRUGSTORE_TITLE, DRUGSTORE_TITLE]);
    expect(await listed()).toEqual([null, null]);
  });

  it("never waits for, nor changes, a movement a verified quarterly statement hides", async () => {
    const userId = await newUser(AUGUST);
    await inContext(userId, async (ctx) =>
      saveStatement(ctx, {
        accountId: await accountOf(ctx),
        balance: VERIFIED,
        statement: await preparedQuarterly([
          {
            date: "2026-08-12",
            amount: -15_000,
            description: "COMPRA EN SURTIFAMILIAR",
          },
        ]),
      }),
    );

    const changed = await inContext(userId, (ctx) =>
      saveLlmCategories(ctx, [
        { ...DRUGSTORE, categoryId: "health", title: DRUGSTORE_TITLE },
      ]),
    );

    expect(changed).toBe(0);
    expect(await waitingOf(userId)).toEqual([
      { descriptionNormalized: "COMPRA EN SURTIFAMILIAR", direction: "out" },
    ]);
  });

  it("never lists nor changes another user's movements", async () => {
    const userId = await newUser(AUGUST);
    const otherId = await newUser(SEPTEMBER);

    await inContext(userId, (ctx) =>
      saveLlmCategories(ctx, [
        { ...DRUGSTORE, categoryId: "health", title: DRUGSTORE_TITLE },
      ]),
    );

    expect(
      (await drugstoreOf(otherId)).map((row) => row.categorySource),
    ).toEqual(["rule"]);
    expect(await waitingOf(userId)).toEqual([
      { descriptionNormalized: "ABONO DEVOLUCION COMPRA", direction: "in" },
    ]);
  });
});
