import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  type TestMovement,
  UNCHECKED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { saveUserCategoryRule } from "../user-category-rules/user-category-rule.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import { listOwnNameTexts } from "./transaction-own-name.queries";

// Invented: the holder's name, as the bank wrote it whole and cut, and a
// transfer to someone else.
const HOLDER = "ANA MARIA PRUEBA GOMEZ";
const OCTOBER: TestMovement[] = [
  {
    date: "2026-10-02",
    amount: -50_000,
    description: "TRANSF A ANA MARIA PRUEB",
  },
  {
    date: "2026-10-09",
    amount: -70_000,
    description: "TRANSF A ANA MARIA PRUEB",
  },
  { date: "2026-10-12", amount: 30_000, description: "TRANSF DE ANA PRUEBA" },
  {
    date: "2026-10-15",
    amount: -20_000,
    description: "TRANSF A ANA PRUEBA GOMEZ",
  },
  {
    date: "2026-10-20",
    amount: -10_000,
    description: "TRANSF A PEDRO GOMEZ R",
  },
];

describe.skipIf(!testDatabase)("the texts of the holder's name", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // A new user whose account keeps the holder's name, with these movements.
  const newUser = async (
    holderName: string,
    movements: readonly TestMovement[],
  ): Promise<UserId> => {
    const userId = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );
    await withUserContext(app.db, userId, async (ctx) => {
      const accountId = await resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
        holderNameNormalized: holderName,
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNCHECKED,
        statement: await preparedExport(movements, { holderName }),
      });
    });
    return userId;
  };

  it("lists the texts the holder's name was recognized in, the most frequent first", async () => {
    const userId = await newUser(HOLDER, OCTOBER);
    await newUser("LUIS OTRO PEREZ", [
      {
        date: "2026-10-03",
        amount: -9_000,
        description: "TRANSF A LUIS OTRO PE",
      },
    ]);

    expect(await withUserContext(app.db, userId, listOwnNameTexts)).toEqual([
      "TRANSF A ANA MARIA PRUEB",
      "TRANSF A ANA PRUEBA GOMEZ",
      "TRANSF DE ANA PRUEBA",
    ]);
  });

  it("leaves out a text the user said is someone else's", async () => {
    const userId = await newUser(HOLDER, OCTOBER);

    const texts = await withUserContext(app.db, userId, async (ctx) => {
      await saveUserCategoryRule(ctx, {
        target: "description",
        descriptionFolded: "TRANSF DE ANA PRUEBA",
        direction: "in",
        categoryId: "income_transfer",
      });
      return listOwnNameTexts(ctx);
    });

    expect(texts).toEqual([
      "TRANSF A ANA MARIA PRUEB",
      "TRANSF A ANA PRUEBA GOMEZ",
    ]);
  });
});
