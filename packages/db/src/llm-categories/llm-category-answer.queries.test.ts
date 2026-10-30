import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  cacheLlmCategories,
  findCachedLlmCategories,
} from "./llm-category-answer.queries";
import { llmCategoryAnswers } from "./llm-category-answer.schemas";

const PERMISSION_DENIED = "42501";
const PROMPT = { name: "categorize", version: 1 };

// Other test files share the cache, so each test asks about texts of its own.
const answerFor = (redactedText: string) => ({
  redactedText,
  direction: "out" as const,
  categoryId: "health" as const,
  confidence: 0.92,
  model: "deepseek-flash",
  title: "Compra en una droguería",
});

const newText = () => `COMPRA EN TIENDA ${randomUUID().slice(0, 8)}`;

describe.skipIf(!testDatabase)("the LLM's answers by redacted text", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const newUser = () => findOrCreateUser(app.db, `test_${randomUUID()}`);

  const inContext = <T>(
    userId: UserId,
    run: (ctx: UserContext) => Promise<T>,
  ) => withUserContext(app.db, userId, run);

  it("gives a text's answer to any user, linked to none", async () => {
    const text = newText();
    await inContext(await newUser(), (ctx) =>
      cacheLlmCategories(ctx, PROMPT, [answerFor(text)]),
    );

    const found = await inContext(await newUser(), (ctx) =>
      findCachedLlmCategories(ctx, PROMPT, [
        { redactedText: text, direction: "out" },
      ]),
    );

    expect(found).toEqual([answerFor(text)]);
  });

  it("keeps each answer for its prompt's version and its money's direction", async () => {
    const text = newText();
    const userId = await newUser();
    await inContext(userId, (ctx) =>
      cacheLlmCategories(ctx, PROMPT, [answerFor(text)]),
    );

    const found = await inContext(userId, async (ctx) => [
      ...(await findCachedLlmCategories(ctx, { ...PROMPT, version: 2 }, [
        { redactedText: text, direction: "out" },
      ])),
      ...(await findCachedLlmCategories(ctx, PROMPT, [
        { redactedText: text, direction: "in" },
      ])),
    ]);

    expect(found).toEqual([]);
  });

  it("keeps a text's first answer for a version", async () => {
    const text = newText();
    const userId = await newUser();

    const found = await inContext(userId, async (ctx) => {
      await cacheLlmCategories(ctx, PROMPT, [answerFor(text)]);
      await cacheLlmCategories(ctx, PROMPT, [
        { ...answerFor(text), categoryId: "shopping" },
      ]);
      return findCachedLlmCategories(ctx, PROMPT, [
        { redactedText: text, direction: "out" },
      ]);
    });

    expect(found.map(({ categoryId }) => categoryId)).toEqual(["health"]);
  });

  it("finds nothing without texts to look for", async () => {
    const userId = await newUser();

    const found = await inContext(userId, async (ctx) => {
      await cacheLlmCategories(ctx, PROMPT, [answerFor(newText())]);
      return findCachedLlmCategories(ctx, PROMPT, []);
    });

    expect(found).toEqual([]);
  });

  it("never lets the application change or delete an answer", async () => {
    const text = newText();
    const userId = await newUser();
    await inContext(userId, (ctx) =>
      cacheLlmCategories(ctx, PROMPT, [answerFor(text)]),
    );
    const sameText = eq(llmCategoryAnswers.redactedText, text);

    expect(
      await pgErrorCode(
        inContext(userId, ({ tx }) =>
          tx
            .update(llmCategoryAnswers)
            .set({ categoryId: "shopping" })
            .where(sameText),
        ),
      ),
    ).toBe(PERMISSION_DENIED);
    expect(
      await pgErrorCode(
        inContext(userId, ({ tx }) =>
          tx.delete(llmCategoryAnswers).where(sameText),
        ),
      ),
    ).toBe(PERMISSION_DENIED);
  });
});
