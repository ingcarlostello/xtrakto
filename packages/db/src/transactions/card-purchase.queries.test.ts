import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type CardMovement,
  preparedCard,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { listCardPurchases } from "./card-purchase.queries";

// A purchase in 12 installments, and one in a single payment.
const SEPTEMBER: CardMovement[] = [
  {
    date: "2026-08-20",
    amount: -120_000_000,
    description: "Almacen Ropa",
    installment: { number: 1, count: 12, remainingMinor: 110_000_000 },
  },
  { date: "2026-08-25", amount: -3_000_000, description: "Cafe Central" },
];

describe.skipIf(!testDatabase)("a card's purchases by fingerprint", () => {
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

  // A Nu card with September saved; the purchase's fingerprint, as its
  // statement keeps its installment.
  const withSeptember = async () => {
    const userId = toUserId(await insertUser(owner.db));
    const statement = await preparedCard(SEPTEMBER);
    const accountId = await withUserContext(app.db, userId, async (ctx) => {
      const id = await resolveIdentifiedAccount(ctx, {
        bankId: "nu",
        accountType: "credit_card",
        last4: "5678",
        currency: "COP",
      });
      const saved = await saveStatement(ctx, {
        accountId: id,
        statement,
        balance: VERIFIED,
      });
      if (!saved.ok) throw new Error("Expected a save.");
      return id;
    });
    const [installment] = statement.card?.installments ?? [];
    if (!installment) throw new Error("Expected an installment.");
    return { userId, accountId, fingerprint: installment.fingerprint };
  };

  const purchasesOf = (
    userId: UserId,
    accountId: string,
    fingerprints: readonly string[],
  ) =>
    withUserContext(app.db, userId, (ctx) =>
      listCardPurchases(ctx, { accountId, fingerprints }),
    );

  it("reads the purchase an installment belongs to, as a list shows it", async () => {
    const { userId, accountId, fingerprint } = await withSeptember();

    const purchases = await purchasesOf(userId, accountId, [fingerprint]);

    expect(purchases).toEqual([
      expect.objectContaining({
        date: "2026-08-20",
        descriptionRaw: "Almacen Ropa",
        amountMinor: -120_000_000,
        fingerprint,
      }),
    ]);
  });

  it("reads none without fingerprints, nor another user's", async () => {
    const { userId, accountId, fingerprint } = await withSeptember();
    const stranger = toUserId(await insertUser(owner.db));

    expect(await purchasesOf(userId, accountId, [])).toEqual([]);
    expect(await purchasesOf(stranger, accountId, [fingerprint])).toEqual([]);
  });
});
