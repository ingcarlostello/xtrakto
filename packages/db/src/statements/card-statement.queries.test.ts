import { preparedCardSchema, type CategorizedStatement } from "@xtrakto/core";
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type CardMovement,
  preparedCard,
  preparedExport,
  UNCHECKED,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { countCountedMovements } from "../coverage/coverage.queries";
import { transactions } from "../transactions/transaction.schemas";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { saveStatement } from "./statement.queries";
import { statements } from "./statement.schemas";
import type { BalanceCheck } from "./statement.types";

// A purchase of $1.200.000 in 12 installments on 20 August, which September's
// statement charges first and October's lists again.
const PURCHASE = {
  date: "2026-08-20",
  amount: -120_000_000,
  description: "Almacen Ropa",
};
const SEPTEMBER: CardMovement[] = [
  {
    ...PURCHASE,
    installment: { number: 1, count: 12, remainingMinor: 110_000_000 },
  },
  {
    date: "2026-09-01",
    amount: 50_000_000,
    description: "Gracias por tu pago",
  },
  { date: "2026-09-10", amount: -2_000_000, description: "Intereses" },
];
const OCTOBER_PERIOD = { from: "2026-09-11", to: "2026-10-10" };
// Its own purchase first, so September's sits elsewhere than in September.
const OCTOBER: CardMovement[] = [
  {
    date: "2026-09-25",
    amount: -30_000_000,
    description: "Restaurante El Patio",
  },
  {
    ...PURCHASE,
    installment: { number: 2, count: 12, remainingMinor: 100_000_000 },
  },
];

type Card = { readonly userId: UserId; readonly accountId: string };

describe.skipIf(!testDatabase)("saving a card's statement", () => {
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

  const newAccount = async (accountType: "credit_card" | "savings") => {
    const userId = toUserId(await insertUser(owner.db));
    const accountId = await withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "nu",
        accountType,
        last4: "5678",
        currency: "COP",
      }),
    );
    return { userId, accountId };
  };

  const saveIn = async (
    card: Card,
    statement: CategorizedStatement,
    balance: BalanceCheck,
  ) => {
    const result = await withUserContext(app.db, card.userId, (ctx) =>
      saveStatement(ctx, { accountId: card.accountId, statement, balance }),
    );
    if (!result.ok) throw new Error(`Not saved: ${result.error.code}`);
    return result.value;
  };

  const counted = (card: Card) =>
    withUserContext(app.db, card.userId, (ctx) =>
      countCountedMovements(ctx, { accountId: card.accountId }),
    );

  const statementsIn = async (accountId: string) => {
    const [row] = await owner.db
      .select({ saved: count() })
      .from(statements)
      .where(eq(statements.accountId, accountId));
    return row?.saved;
  };

  // Read back as the app would: through core's schema.
  const cardOf = async (statementId: string) => {
    const [row] = await owner.db
      .select({ card: statements.card })
      .from(statements)
      .where(eq(statements.id, statementId));
    return preparedCardSchema.parse(row?.card);
  };

  // Each movement with the period of the statement that holds it.
  const placesOf = (accountId: string) =>
    owner.db
      .select({
        date: transactions.date,
        position: transactions.position,
        periodFrom: statements.periodFrom,
      })
      .from(transactions)
      .innerJoin(statements, eq(statements.id, transactions.statementId))
      .where(eq(transactions.accountId, accountId))
      .orderBy(transactions.date);

  const categoriesOf = (accountId: string) =>
    owner.db
      .select({
        amount: transactions.amountMinor,
        ruleId: transactions.categoryRuleId,
        categoryId: transactions.categoryId,
      })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(transactions.date);

  it("keeps its figures and installments, and its movements in Xtrakto's signs with the card's rules", async () => {
    const card = await newAccount("credit_card");
    const september = await preparedCard(SEPTEMBER);

    const saved = await saveIn(card, september, VERIFIED);

    expect(saved).toMatchObject({ total: 3, added: 3, skipped: 0 });
    expect(await cardOf(saved.statementId)).toEqual(september.card);
    expect((await cardOf(saved.statementId)).installments).toEqual([
      {
        number: 1,
        count: 12,
        remainingMinor: 110_000_000,
        fingerprint: september.transactions[0]?.fingerprint,
      },
    ]);
    expect(await categoriesOf(card.accountId)).toEqual([
      {
        amount: -120_000_000,
        ruleId: "unknown_merchant",
        categoryId: "other_spending",
      },
      {
        amount: 50_000_000,
        ruleId: "card_payment_received",
        categoryId: "credit_card_payment",
      },
      {
        amount: -2_000_000,
        ruleId: "card_interest",
        categoryId: "taxes_and_fees",
      },
    ]);
  });

  it("keeps out another version of its period once one reconciles", async () => {
    const card = await newAccount("credit_card");
    const first = await saveIn(card, await preparedCard(SEPTEMBER), VERIFIED);

    const second = await saveIn(
      card,
      await preparedCard(SEPTEMBER, { minimumMinor: 1_300_000 }),
      VERIFIED,
    );

    expect(second).toEqual({
      statementId: first.statementId,
      total: 3,
      added: 0,
      skipped: 3,
      covered: 0,
      hidden: 0,
      replaced: 0,
    });
    expect(await statementsIn(card.accountId)).toBe(1);
  });

  it("counts nothing of a version that doesn't reconcile, until one that does replaces it", async () => {
    const card = await newAccount("credit_card");
    const first = await saveIn(card, await preparedCard(SEPTEMBER), UNVERIFIED);

    expect(first).toMatchObject({ total: 3, added: 0, skipped: 0 });
    expect(await counted(card)).toBe(0);

    const second = await saveIn(
      card,
      await preparedCard(SEPTEMBER, { minimumMinor: 1_300_000 }),
      VERIFIED,
    );

    expect(second).toMatchObject({ added: 3, skipped: 0, replaced: 1 });
    expect(second.statementId).not.toBe(first.statementId);
    expect(await statementsIn(card.accountId)).toBe(1);
    expect(await counted(card)).toBe(3);
  });

  it("adds nothing for a purchase a later statement lists again, and keeps what each one charges of it", async () => {
    const card = await newAccount("credit_card");
    const september = await preparedCard(SEPTEMBER);
    const october = await preparedCard(OCTOBER, OCTOBER_PERIOD);
    const purchase = september.transactions[0]?.fingerprint;
    const savedSeptember = await saveIn(card, september, VERIFIED);

    const savedOctober = await saveIn(card, october, VERIFIED);

    expect(october.transactions[1]?.fingerprint).toBe(purchase);
    expect(savedOctober).toMatchObject({ total: 2, added: 1, skipped: 1 });
    expect(await counted(card)).toBe(4);
    expect(
      (await cardOf(savedSeptember.statementId)).installments,
    ).toMatchObject([{ number: 1, fingerprint: purchase }]);
    expect((await cardOf(savedOctober.statementId)).installments).toEqual([
      {
        number: 2,
        count: 12,
        remainingMinor: 100_000_000,
        fingerprint: purchase,
      },
    ]);
  });

  // Whether October reconciles or not, September's purchase is September's.
  it.each([
    ["reconciles", VERIFIED, 4],
    ["doesn't reconcile", UNVERIFIED, 3],
  ])(
    "gives each movement to the statement of its period in either upload order, when October %s",
    async (_, octoberBalance, countedMovements) => {
      const saveBoth = async (isSeptemberFirst: boolean) => {
        const card = await newAccount("credit_card");
        const saves = [
          async () => saveIn(card, await preparedCard(SEPTEMBER), VERIFIED),
          async () =>
            saveIn(
              card,
              await preparedCard(OCTOBER, OCTOBER_PERIOD),
              octoberBalance,
            ),
        ];
        for (const save of isSeptemberFirst ? saves : saves.toReversed()) {
          await save();
        }
        return {
          places: await placesOf(card.accountId),
          counted: await counted(card),
        };
      };

      const septemberFirst = await saveBoth(true);

      expect(await saveBoth(false)).toEqual(septemberFirst);
      expect(septemberFirst).toEqual({
        places: [
          { date: "2026-08-20", position: 0, periodFrom: "2026-08-12" },
          { date: "2026-09-01", position: 1, periodFrom: "2026-08-12" },
          { date: "2026-09-10", position: 2, periodFrom: "2026-08-12" },
          { date: "2026-09-25", position: 0, periodFrom: "2026-09-11" },
        ],
        counted: countedMovements,
      });
    },
  );

  it("never gives a card's rules to a savings account's movements", async () => {
    const savings = await newAccount("savings");

    await saveIn(
      savings,
      await preparedExport([
        { date: "2026-10-01", amount: -2_000_000, description: "Intereses" },
        {
          date: "2026-10-02",
          amount: 50_000_000,
          description: "ABONO SUCURSAL VIRTUAL",
        },
      ]),
      UNCHECKED,
    );

    expect(await categoriesOf(savings.accountId)).toEqual([
      { amount: -2_000_000, ruleId: null, categoryId: null },
      { amount: 50_000_000, ruleId: null, categoryId: null },
    ]);
  });
});
