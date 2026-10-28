import type { UserCategoryRule } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  findUserCategoryRule,
  listOwnUserCategoryRules,
} from "./user-category-rule-own.queries";
import { saveUserCategoryRule } from "./user-category-rule.queries";

// Invented: HMACs as the CHECK wants them (64 hex digits), for numbers no
// movement needs to carry.
const MY_NEQUI: UserCategoryRule = {
  target: "reference",
  referenceHash: "a".repeat(64),
  referenceLast4: "1270",
  categoryId: "own_account_transfer",
};
const SOMEONE_ELSES_NEQUI: UserCategoryRule = {
  target: "reference",
  referenceHash: "b".repeat(64),
  referenceLast4: "4321",
  categoryId: "transfers_to_people",
};
const MY_CARD: UserCategoryRule = {
  target: "description",
  descriptionFolded: "PAGO PSE NU COMPANIA DE FINA",
  direction: "out",
  categoryId: "credit_card_payment",
};
const GROCERIES: UserCategoryRule = {
  target: "description",
  descriptionFolded: "COMPRA EN TIENDA",
  direction: "out",
  categoryId: "groceries",
};

describe.skipIf(!testDatabase)(
  "the user's rules that make something theirs",
  () => {
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

    // A new user with these rules saved.
    const newUser = async (rules: readonly UserCategoryRule[]) => {
      const userId = await findOrCreateUser(
        app.db,
        `test_${crypto.randomUUID()}`,
      );
      await inContext(userId, async (ctx) => {
        for (const rule of rules) await saveUserCategoryRule(ctx, rule);
      });
      return userId;
    };

    it("lists only those that count as moved, each with its id", async () => {
      const userId = await newUser([
        MY_NEQUI,
        SOMEONE_ELSES_NEQUI,
        MY_CARD,
        GROCERIES,
      ]);

      const own = await inContext(userId, listOwnUserCategoryRules);

      expect(own.map(({ rule }) => rule)).toEqual(
        expect.arrayContaining([MY_NEQUI, MY_CARD]),
      );
      expect(own).toHaveLength(2);
      expect(own.every(({ id }) => typeof id === "string")).toBe(true);
    });

    it("finds a rule by its id for its user, never for another", async () => {
      const userId = await newUser([MY_CARD]);
      const otherId = await newUser([]);
      const [own] = await inContext(userId, listOwnUserCategoryRules);
      if (!own) throw new Error("The card's rule wasn't saved.");

      expect(
        await inContext(userId, (ctx) => findUserCategoryRule(ctx, own.id)),
      ).toEqual(MY_CARD);
      expect(
        await inContext(otherId, (ctx) => findUserCategoryRule(ctx, own.id)),
      ).toBeUndefined();
      expect(
        await inContext(userId, (ctx) =>
          findUserCategoryRule(ctx, crypto.randomUUID()),
        ),
      ).toBeUndefined();
    });
  },
);
