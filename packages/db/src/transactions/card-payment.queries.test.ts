import {
  type CategorizedStatement,
  pairCardPayments,
  periodSchema,
} from "@xtrakto/core";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedCard,
  preparedExport,
  UNCHECKED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { statements } from "../statements/statement.schemas";
import { saveStatement } from "../statements/statement.queries";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import {
  findCardPaymentPair,
  linkCardPayments,
  listCardPaymentCandidates,
  listPaidCards,
} from "./card-payment.queries";
import { transactions } from "./transaction.schemas";

// A PSE payment to Nu from the savings account, which the rules ask about,
// and the card's payment the next day.
const PAYMENT = "PAGO PSE NU COLOMBIA";
const RECEIVED = "Gracias por tu pago";
const SEPTEMBER = periodSchema.parse({ from: "2026-09-01", to: "2026-09-30" });

describe.skipIf(!testDatabase)("a card's payments across accounts", () => {
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

  const accountOf = (userId: UserId, accountType: "credit_card" | "savings") =>
    withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: accountType === "credit_card" ? "nu" : "bancolombia",
        accountType,
        last4: accountType === "credit_card" ? "5678" : "8901",
        currency: "COP",
      }),
    );

  const save = async (
    userId: UserId,
    accountId: string,
    statement: CategorizedStatement,
  ) => {
    const saved = await withUserContext(app.db, userId, (ctx) =>
      saveStatement(ctx, {
        accountId,
        statement,
        balance: statement.card ? VERIFIED : UNCHECKED,
      }),
    );
    if (!saved.ok) throw new Error("Expected a save.");
    return saved.value.statementId;
  };

  // The movement of the account with the bank's text.
  const movementOf = async (userId: UserId, text: string) => {
    const [row] = await withUserContext(app.db, userId, (ctx) =>
      ctx.tx
        .select({
          id: transactions.id,
          paidCardMovementId: transactions.paidCardMovementId,
          isPendingReview: transactions.isPendingReview,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.descriptionRaw, text),
          ),
        ),
    );
    if (!row) throw new Error(`No movement "${text}".`);
    return row;
  };

  // A person who paid their Nu card from their savings account.
  const personWhoPaid = async () => {
    const userId = toUserId(await insertUser(owner.db));
    const savings = await accountOf(userId, "savings");
    const card = await accountOf(userId, "credit_card");
    await save(
      userId,
      savings,
      await preparedExport([
        { date: "2026-09-05", amount: -50_000_000, description: PAYMENT },
      ]),
    );
    const cardStatement = await save(
      userId,
      card,
      await preparedCard([
        { date: "2026-09-06", amount: 50_000_000, description: RECEIVED },
      ]),
    );
    return { userId, savings, card, cardStatement };
  };

  const pairAll = (userId: UserId) =>
    withUserContext(app.db, userId, async (ctx) => {
      const { payments, received } = await listCardPaymentCandidates(ctx);
      await linkCardPayments(ctx, pairCardPayments(payments, received));
    });

  it("lists the payments to a card and the card's payments not paired yet, and pairs them, leaving the review", async () => {
    const { userId } = await personWhoPaid();
    const before = await movementOf(userId, PAYMENT);
    expect(before.isPendingReview).toBe(true);

    const candidates = await withUserContext(
      app.db,
      userId,
      listCardPaymentCandidates,
    );
    expect(candidates.payments.map(({ id }) => id)).toEqual([before.id]);
    expect(candidates.received.map(({ date }) => date)).toEqual(["2026-09-06"]);

    await pairAll(userId);

    const received = await movementOf(userId, RECEIVED);
    expect(await movementOf(userId, PAYMENT)).toEqual({
      id: before.id,
      paidCardMovementId: received.id,
      isPendingReview: false,
    });
    expect(
      await withUserContext(app.db, userId, listCardPaymentCandidates),
    ).toEqual({ payments: [], received: [] });
  });

  it("names each side's other, and the cards a period's payments reached", async () => {
    const { userId, savings, card } = await personWhoPaid();
    await pairAll(userId);
    const payment = await movementOf(userId, PAYMENT);
    const received = await movementOf(userId, RECEIVED);

    const [to, from, paid] = await withUserContext(
      app.db,
      userId,
      async (ctx) => [
        await findCardPaymentPair(ctx, payment.id),
        await findCardPaymentPair(ctx, received.id),
        await listPaidCards(ctx, { accountId: savings, period: SEPTEMBER }),
      ],
    );

    expect(to).toEqual({
      direction: "to",
      movementId: received.id,
      date: "2026-09-06",
      account: {
        id: card,
        bankId: "nu",
        accountType: "credit_card",
        last4: "5678",
      },
    });
    expect(from).toMatchObject({
      direction: "from",
      movementId: payment.id,
      account: { id: savings, accountType: "savings" },
    });
    expect(paid).toEqual([
      { id: card, bankId: "nu", accountType: "credit_card", last4: "5678" },
    ]);
  });

  it("empties only the link when the card's movement goes", async () => {
    const { userId, cardStatement } = await personWhoPaid();
    await pairAll(userId);

    await owner.db.delete(statements).where(eq(statements.id, cardStatement));

    expect(await movementOf(userId, PAYMENT)).toMatchObject({
      paidCardMovementId: null,
    });
  });

  it("never pairs another user's", async () => {
    await personWhoPaid();
    const stranger = toUserId(await insertUser(owner.db));

    expect(
      await withUserContext(app.db, stranger, listCardPaymentCandidates),
    ).toEqual({ payments: [], received: [] });
  });
});
