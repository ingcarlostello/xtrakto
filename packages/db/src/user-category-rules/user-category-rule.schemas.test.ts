import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser, pgErrorCode, sha256Hex } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { userCategoryRules } from "./user-category-rule.schemas";

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

type RuleRow = typeof userCategoryRules.$inferInsert;

const textRule = (userId: string): RuleRow => ({
  userId,
  descriptionFolded: "PAGO LLAVE INVERSIONES XY",
  direction: "out",
  categoryId: "investment",
});

const referenceRule = (userId: string, referenceHash: string): RuleRow => ({
  userId,
  referenceHash,
  referenceLast4: "1270",
  categoryId: "own_account_transfer",
});

describe.skipIf(!testDatabase)("user_category_rules table", () => {
  let owner: DbClient;

  beforeAll(() => {
    owner = createDb({ connectionString: requireTestDatabase().ownerUrl });
  });

  afterAll(async () => {
    await owner.pool.end();
  });

  const insert = (row: RuleRow) =>
    owner.db.insert(userCategoryRules).values(row);

  it.each([
    [
      "neither a text nor a reference",
      { descriptionFolded: null, direction: null },
    ],
    ["both a text and a reference", { referenceHash: sha256Hex() }],
    ["a text without its direction", { direction: null }],
    // A value the type forbids, cast so it reaches the CHECK.
    ["another direction", { direction: "both" as "in" }],
    ["the bank's 0", { descriptionFolded: "0" }],
    ["an empty text", { descriptionFolded: "" }],
    ["last digits without a reference", { referenceLast4: "1270" }],
  ])("rejects %s", async (_, change) => {
    const userId = await insertUser(owner.db);

    expect(await pgErrorCode(insert({ ...textRule(userId), ...change }))).toBe(
      CHECK_VIOLATION,
    );
  });

  it.each([
    ["a direction for a reference", { direction: "out" as const }],
    ["a hash that isn't SHA-256 hex", { referenceHash: "ABC" }],
    ["last digits that aren't 4", { referenceLast4: "127" }],
  ])("rejects %s", async (_, change) => {
    const userId = await insertUser(owner.db);
    const row = { ...referenceRule(userId, sha256Hex()), ...change };

    expect(await pgErrorCode(insert(row))).toBe(CHECK_VIOLATION);
  });

  it("keeps one rule per text and direction, and one per reference, for each user", async () => {
    const userId = await insertUser(owner.db);
    const otherUserId = await insertUser(owner.db);
    const hash = sha256Hex();
    await insert(textRule(userId));
    await insert(referenceRule(userId, hash));

    expect(await pgErrorCode(insert(textRule(userId)))).toBe(UNIQUE_VIOLATION);
    expect(await pgErrorCode(insert(referenceRule(userId, hash)))).toBe(
      UNIQUE_VIOLATION,
    );
    await expect(
      insert({ ...textRule(userId), direction: "in" }),
    ).resolves.not.toThrow();
    await expect(insert(textRule(otherUserId))).resolves.not.toThrow();
    await expect(
      insert(referenceRule(otherUserId, hash)),
    ).resolves.not.toThrow();
  });
});
