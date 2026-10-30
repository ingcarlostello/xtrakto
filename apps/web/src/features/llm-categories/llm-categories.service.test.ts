import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  err,
  type ExtractedContent,
  extractedContentSchema,
  MONEY_DIRECTION,
  ok,
  type Result,
} from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findCachedLlmCategories,
  findOrCreateUser,
  listLlmWaitingTexts,
  listMovementAccounts,
  listTransactions,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type {
  AiError,
  AiLedger,
  StructuredAnswer,
  StructuredCall,
} from "@/lib/ai";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import {
  categorizeTexts,
  categorizeWaitingMovements,
} from "./llm-categories.service";
import type { CategorizeAnswer } from "./prompts/categorize.v1";

type Generate = (
  call: StructuredCall<CategorizeAnswer>,
) => Promise<Result<StructuredAnswer<CategorizeAnswer>, AiError>>;

// DeepSeek is replaced by a model that answers every line it gets: shopping
// for money out, a refund for money in. A round's ledger lets every call
// through; the database is the test one, as the application role.
const mocks = vi.hoisted(() => ({
  generateStructured: vi.fn<Generate>(),
  db: undefined as unknown,
}));

vi.mock("@/lib/ai", () => ({ generateStructured: mocks.generateStructured }));
vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    IDENTIFIER_HASH_KEY: "test-key-with-at-least-32-characters!",
  }),
}));
vi.mock("@/features/llm-usage/llm-usage.service", () => ({
  userLedger: () => LEDGER,
}));

const { IN, OUT } = MONEY_DIRECTION;
const LEDGER: AiLedger = { check: async () => undefined, record: vi.fn() };
const FAILED: AiError = {
  code: "AI_FAILED",
  failures: [{ model: "deepseek-flash", reason: "TIMEOUT" }],
};

const answerEveryLine: Generate = async ({ input }) => {
  const answers = input.split("\n").map((line) => {
    const [, number = "0", direction] = /^(\d+)\. (in|out) \|/.exec(line) ?? [];
    const category = direction === IN ? "refund" : "shopping";
    return { line: Number(number), category, confidence: 0.9 } as const;
  });
  return ok({ value: { answers }, model: "deepseek-flash" });
};

// Texts out, but every third one in.
const textsOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    text: `COMPRA EN TIENDA ${index}`,
    direction: index % 3 === 2 ? IN : OUT,
  }));

const calls = () => mocks.generateStructured.mock.calls.map(([call]) => call);

beforeEach(() => {
  mocks.generateStructured.mockReset();
  mocks.generateStructured.mockImplementation(answerEveryLine);
});

describe("categorizeTexts", () => {
  it("asks in batches of 25 and gives each answer to its text", async () => {
    const { answers, stoppedBy } = await categorizeTexts({
      texts: textsOf(30),
      ledger: LEDGER,
    });

    const [first, second] = calls();
    expect(first?.input.split("\n")).toHaveLength(25);
    expect(second?.input).toBe(
      [
        "1. out | COMPRA EN TIENDA 25",
        "2. in | COMPRA EN TIENDA 26",
        "3. out | COMPRA EN TIENDA 27",
        "4. out | COMPRA EN TIENDA 28",
        "5. in | COMPRA EN TIENDA 29",
      ].join("\n"),
    );
    expect(answers.size).toBe(30);
    expect(answers.get(26)).toEqual({
      categoryId: "refund",
      confidence: 0.9,
      model: "deepseek-flash",
    });
    expect(answers.get(27)).toMatchObject({ categoryId: "shopping" });
    expect(stoppedBy).toBeUndefined();
  });

  it("asks with the categorization prompt, the caller's ledger and models", async () => {
    await categorizeTexts({
      texts: textsOf(1),
      ledger: LEDGER,
      models: ["deepseek-v4-pro"],
    });

    expect(calls()[0]).toMatchObject({
      prompt: { name: "categorize", version: 1 },
      ledger: LEDGER,
      models: ["deepseek-v4-pro"],
    });
  });

  it("stops at the first failure, keeping the answers before it", async () => {
    mocks.generateStructured
      .mockImplementationOnce(answerEveryLine)
      .mockResolvedValueOnce(err(FAILED));

    const { answers, stoppedBy } = await categorizeTexts({
      texts: textsOf(60),
      ledger: LEDGER,
    });

    expect(calls()).toHaveLength(2);
    expect([...answers.keys()]).toEqual(
      Array.from({ length: 25 }, (_, i) => i),
    );
    expect(stoppedBy).toEqual(FAILED);
  });

  it("asks nothing without texts", async () => {
    const { answers } = await categorizeTexts({ texts: [], ledger: LEDGER });

    expect(calls()).toHaveLength(0);
    expect(answers.size).toBe(0);
  });
});

// A movements export with these invented texts, as the browser sends it.
const exportOf = (
  movements: readonly { readonly text: string; readonly amount: number }[],
): ExtractedContent => {
  const content = extractedContentSchema.parse({
    type: "spreadsheet",
    sheets: [
      {
        name: "Hoja1",
        rows: [
          ["Fecha", "Descripción", "Referencia", "Valor"],
          ...movements.map(({ text, amount }) => [
            { excelSerial: 46302.208333333336 },
            text,
            null,
            amount,
          ]),
        ],
      },
    ],
  });
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes the export.");
  return parser.value.minimize(content);
};

// DeepSeek knows a drugstore and a refund, and isn't sure of a shop.
const answerByText: Generate = async ({ input }) => {
  const answers = input.split("\n").map((line) => {
    const [, number = "0", text = ""] =
      /^(\d+)\. \w+ \| (.*)$/.exec(line) ?? [];
    const at = Number(number);
    if (text.includes("AUDIFARMA"))
      return { line: at, category: "health", confidence: 0.95 } as const;
    if (text.includes("DEVOLUCION"))
      return { line: at, category: "refund", confidence: 0.9 } as const;
    return { line: at, category: "shopping", confidence: 0.4 } as const;
  });
  return ok({ value: { answers }, model: "deepseek-flash" });
};

// The synthetic quarterly statement, whose holder is ANA MARIA PRUEBA GOMEZ.
const quarterlyBasic = (): ExtractedContent => {
  const json = readFileSync(
    new URL(
      "../../../../../packages/parsers/fixtures/quarterly-basic.json",
      import.meta.url,
    ),
    "utf8",
  );
  const content = extractedContentSchema.parse(JSON.parse(json));
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes the statement.");
  return parser.value.minimize(content);
};

const HOUR_MS = 3_600_000;

describe.skipIf(!testDatabase)("categorizeWaitingMovements", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    mocks.db = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  beforeEach(() => {
    mocks.generateStructured.mockImplementation(answerByText);
  });

  // Texts of their own for each test, since the cache is shared.
  const newTag = () => `T${String(randomInt(100_000)).padStart(5, "0")}`;

  // A drugstore and a shop no rule knows, and money in no rule knows.
  const textsOf = (tag: string) => ({
    drugstore: `COMPRA EN AUDIFARMA ${tag}`,
    refund: `ABONO DEVOLUCION ${tag}`,
    shop: `COMPRA EN TIENDA ${tag}`,
  });

  // Uploads a statement as the submit action and the function do.
  const upload = async (userId: UserId, content: ExtractedContent) => {
    const parser = findParser(content);
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(
        ctx,
        {
          formatId: parser.ok ? parser.value.id : "unknown",
          extractedContent: content,
        },
        {
          limit: 100,
          month: {
            start: new Date(Date.now() - HOUR_MS),
            end: new Date(Date.now() + HOUR_MS),
          },
        },
      ),
    );
    if (!created.ok) throw new Error("No job created.");
    const job = { jobId: created.value, userId };
    await claimJob(job);
    await ingestJob(job);
  };

  const newUser = async (tag: string) => {
    const userId = await findOrCreateUser(
      app.db,
      `test_${tag}_${randomInt(1e9)}`,
    );
    const { drugstore, refund, shop } = textsOf(tag);
    await upload(
      userId,
      exportOf([
        { text: drugstore, amount: -50_000 },
        { text: refund, amount: 30_000 },
        { text: shop, amount: -20_000 },
      ]),
    );
    return userId;
  };

  // Each movement's text and category.
  const categoriesOf = async (userId: UserId) =>
    withUserContext(app.db, userId, async (ctx) => {
      const [account] = await listMovementAccounts(ctx);
      if (!account) throw new Error("No account.");
      const { items } = await listTransactions(ctx, {
        accountId: account.id,
        offset: 0,
      });
      return Object.fromEntries(
        items.map(({ descriptionRaw, categoryId }) => [
          descriptionRaw,
          categoryId,
        ]),
      );
    });

  const waitingOf = (userId: UserId) =>
    withUserContext(app.db, userId, (ctx) => listLlmWaitingTexts(ctx));

  it("gives the movements no rule names the LLM's confident answers, and keeps every answer", async () => {
    const tag = newTag();
    const { drugstore, refund, shop } = textsOf(tag);
    const userId = await newUser(tag);

    const round = await categorizeWaitingMovements(userId);

    expect(round).toEqual({
      fromCache: 0,
      asked: 3,
      answered: 3,
      categorized: 2,
      hasMore: false,
    });
    expect(await categoriesOf(userId)).toEqual({
      [drugstore]: "health",
      [refund]: "refund",
      [shop]: "other_spending",
    });
    expect(await waitingOf(userId)).toEqual([
      { descriptionNormalized: shop, direction: OUT },
    ]);
    const cached = await withUserContext(app.db, userId, (ctx) =>
      findCachedLlmCategories(ctx, { name: "categorize", version: 1 }, [
        { redactedText: shop, direction: OUT },
      ]),
    );
    expect(cached).toEqual([
      {
        redactedText: shop,
        direction: OUT,
        categoryId: "shopping",
        confidence: 0.4,
        model: "deepseek-flash",
      },
    ]);
  });

  it("answers another user's same texts from the cache, without asking again", async () => {
    const tag = newTag();
    await categorizeWaitingMovements(await newUser(tag));
    const before = calls().length;

    const round = await categorizeWaitingMovements(await newUser(tag));

    expect(round).toEqual({
      fromCache: 2,
      asked: 0,
      answered: 0,
      categorized: 0,
      hasMore: false,
    });
    expect(calls()).toHaveLength(before);
  });

  it("ends as a code when DeepSeek fails, and the texts keep waiting", async () => {
    mocks.generateStructured.mockResolvedValue(err(FAILED));
    const userId = await newUser(newTag());

    const round = await categorizeWaitingMovements(userId);

    expect(round).toEqual({
      fromCache: 0,
      asked: 3,
      answered: 0,
      categorized: 0,
      hasMore: false,
      stoppedBy: "AI_FAILED",
    });
    expect(await waitingOf(userId)).toHaveLength(3);
  });

  it("redacts the user's holder names before a text leaves", async () => {
    const tag = newTag();
    const userId = await findOrCreateUser(app.db, `test_${tag}`);
    await upload(userId, quarterlyBasic());
    await upload(
      userId,
      exportOf([
        { text: `PAGO QR ANA MARIA PRUEBA GOMEZ ${tag}`, amount: -7_000 },
      ]),
    );
    const before = calls().length;

    await categorizeWaitingMovements(userId);

    const sent = calls()
      .slice(before)
      .map(({ input }) => input)
      .join("\n");
    expect(sent).toContain(`| PAGO QR [NAME] ${tag}`);
    expect(sent).not.toContain("ANA MARIA");
  });

  // A user with 27 shops no rule knows, one batch and two texts more.
  const userWithShops = async () => {
    const tag = newTag();
    const userId = await findOrCreateUser(app.db, `test_${tag}`);
    await upload(
      userId,
      exportOf(
        Array.from({ length: 27 }, (_, index) => ({
          text: `COMPRA EN TIENDA ${tag} N${index}`,
          amount: -1_000 - index,
        })),
      ),
    );
    return userId;
  };

  it("ends the rounds when DeepSeek fails, though more texts wait", async () => {
    mocks.generateStructured.mockResolvedValue(err(FAILED));
    const userId = await userWithShops();

    const round = await categorizeWaitingMovements(userId);

    expect(round).toMatchObject({
      asked: 25,
      hasMore: false,
      stoppedBy: "AI_FAILED",
    });
  });

  it("sends one batch a round, and says when more texts wait", async () => {
    const userId = await userWithShops();
    const before = calls().length;

    const first = await categorizeWaitingMovements(userId);
    const second = await categorizeWaitingMovements(userId);

    expect([first, second]).toMatchObject([
      { asked: 25, answered: 25, hasMore: true },
      { asked: 2, answered: 2, hasMore: false },
    ]);
    expect(
      calls()
        .slice(before)
        .map(({ input }) => input.split("\n").length),
    ).toEqual([25, 2]);
  });
});
