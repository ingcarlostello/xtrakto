import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  UNCHECKED,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import { findMovementDetail } from "./transaction-detail.queries";
import { listTransactions } from "./transaction.queries";
import { transactions } from "./transaction.schemas";

const KEY_PAYMENT = "PAGO LLAVE Maria Lopez";
const NEQUI_SEND = "TRANSFERENCIAS A NEQUI";
// On a day the verified quarterly statement covers: saved hidden (ADR 0018).
const COVERED = "COMPRA EN TIENDA CUBIERTA";
// In a quarterly statement that doesn't reconcile: it counts nowhere.
const UNRECONCILED = "COMPRA EN TIENDA SIN CUADRAR";

describe.skipIf(!testDatabase)("movement detail", () => {
  let app: DbClient;
  let userId: UserId;
  let accountId: string;
  let otherAccountId: string;
  const ids = new Map<string, string>();

  const inContext = <T>(read: Parameters<typeof withUserContext<T>>[2]) =>
    withUserContext(app.db, userId, read);

  const accountOf = (last4: string) =>
    inContext((ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4,
        currency: "COP",
      }),
    );

  // Every movement of the account, those that count nowhere too, by text.
  const saveAndRemember = async () => {
    await inContext(async (ctx) => {
      await saveStatement(ctx, {
        accountId,
        balance: VERIFIED,
        statement: await preparedQuarterly([
          { date: "2026-07-03", amount: -60_000, description: KEY_PAYMENT },
        ]),
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNCHECKED,
        statement: await preparedExport([
          { date: "2026-07-10", amount: -7_000, description: COVERED },
          {
            date: "2026-10-02",
            amount: -50_000,
            description: NEQUI_SEND,
            phone: "3001234567",
          },
        ]),
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNVERIFIED,
        statement: await preparedQuarterly(
          [{ date: "2026-11-09", amount: -9_000, description: UNRECONCILED }],
          { from: "2026-09-30", to: "2026-12-31" },
        ),
      });
      const rows = await ctx.tx
        .select({ id: transactions.id, text: transactions.descriptionRaw })
        .from(transactions)
        .where(eq(transactions.accountId, accountId));
      for (const { id, text } of rows) ids.set(text, id);
    });
  };

  const idOf = (text: string) => {
    const id = ids.get(text);
    if (!id) throw new Error(`No movement "${text}".`);
    return id;
  };

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountId = await accountOf("8901");
    otherAccountId = await accountOf("2109");
    await saveAndRemember();
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("reads a movement with its category's source and rule, and the statement it came from", async () => {
    const detail = await inContext((ctx) =>
      findMovementDetail(ctx, { accountId, movementId: idOf(KEY_PAYMENT) }),
    );

    expect(detail).toEqual({
      id: idOf(KEY_PAYMENT),
      date: "2026-07-03",
      descriptionRaw: KEY_PAYMENT,
      descriptionNormalized: KEY_PAYMENT,
      amountMinor: -60_000,
      balanceAfterMinor: 40_000,
      categoryId: "transfers_to_people",
      isPendingReview: true,
      referenceHash: null,
      referenceKind: "none",
      referenceLast4: null,
      categorySource: "rule",
      categoryRuleId: "key_payment",
      llmTitle: null,
      statement: {
        formatId: "bancolombia-savings-quarterly",
        period: { from: "2026-06-30", to: "2026-09-30" },
      },
    });
  });

  it("keeps only the last 4 digits of the number a send went to", async () => {
    const detail = await inContext((ctx) =>
      findMovementDetail(ctx, { accountId, movementId: idOf(NEQUI_SEND) }),
    );

    expect(detail).toMatchObject({
      referenceLast4: "4567",
      balanceAfterMinor: null,
      statement: {
        formatId: "bancolombia-movements-export",
        period: { from: "2026-07-10", to: "2026-10-02" },
      },
    });
    expect(JSON.stringify(detail)).not.toContain("3001234567");
  });

  it("opens no movement that counts nowhere", async () => {
    const found = await inContext((ctx) =>
      Promise.all(
        [COVERED, UNRECONCILED].map((text) =>
          findMovementDetail(ctx, { accountId, movementId: idOf(text) }),
        ),
      ),
    );

    expect(found).toEqual([undefined, undefined]);
  });

  it("opens no movement of another account", async () => {
    const detail = await inContext((ctx) =>
      findMovementDetail(ctx, {
        accountId: otherAccountId,
        movementId: idOf(KEY_PAYMENT),
      }),
    );

    expect(detail).toBeUndefined();
  });

  it("opens no movement of another user", async () => {
    const intruder = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );

    const detail = await withUserContext(app.db, intruder, (ctx) =>
      findMovementDetail(ctx, { accountId, movementId: idOf(KEY_PAYMENT) }),
    );

    expect(detail).toBeUndefined();
  });

  it("lists the same movement it details", async () => {
    const { items } = await inContext((ctx) =>
      listTransactions(ctx, { accountId, limit: 10, offset: 0 }),
    );

    expect(items.map(({ id }) => id)).toEqual([
      idOf(NEQUI_SEND),
      idOf(KEY_PAYMENT),
    ]);
  });
});
