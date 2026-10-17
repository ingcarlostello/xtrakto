import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  type ExtractedContent,
  extractedContentSchema,
  type ParsedStatement,
} from "@xtrakto/core";
import {
  countSlotsUsed,
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  listAccounts,
  listIngestionJobResults,
  listTransactions,
  type NewIngestionJob,
  resolveIdentifiedAccount,
  saveStatement,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  claimJob,
  failJob,
  ingestJob,
  type JobRef,
} from "./ingest-statement.service";

// Against the test database, as the application role: the queries and their
// Row-Level Security run for real. Each test creates its own users.
const database = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/lib/db", () => ({ getDb: () => database.current }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    IDENTIFIER_HASH_KEY: "test-key-with-at-least-32-characters!",
  }),
}));
vi.mock("@xtrakto/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xtrakto/db")>();
  return { ...actual, saveStatement: vi.fn(actual.saveStatement) };
});

const FIXTURES = new URL(
  "../../../../../packages/parsers/fixtures/",
  import.meta.url,
);
const HOUR_MS = 3_600_000;
const MONTH = {
  start: new Date(Date.now() - HOUR_MS),
  end: new Date(Date.now() + HOUR_MS),
};

// A fixture as the browser sends it: minimized by its format's parser.
const fixture = (name: string): ExtractedContent => {
  const json: unknown = JSON.parse(
    readFileSync(new URL(`${name}.json`, FIXTURES), "utf8"),
  );
  const content = extractedContentSchema.parse(json);
  const parser = findParser(content);
  if (!parser.ok) throw new Error(`No parser recognizes ${name}.`);
  return parser.value.minimize(content);
};

const parse = (content: ExtractedContent): ParsedStatement => {
  const parser = findParser(content);
  const parsed = parser.ok ? parser.value.parse(content) : undefined;
  if (!parsed?.ok) throw new Error("The fixture doesn't parse.");
  return parsed.value;
};

// A quarterly statement cut before the row its parser requires at the end.
const withoutEndMarker = (content: ExtractedContent): ExtractedContent =>
  content.type === "spreadsheet"
    ? {
        ...content,
        sheets: content.sheets.map((sheet) => ({
          ...sheet,
          rows: sheet.rows.filter(
            (row) => !row.includes("FIN ESTADO DE CUENTA"),
          ),
        })),
      }
    : content;

const QUARTERLY = fixture("quarterly-basic");
const PREVIOUS_QUARTERLY = fixture("quarterly-previous");
const BROKEN_QUARTERLY = fixture("quarterly-broken-balance");
const JULY_EXPORT = fixture("movements-overlap");
const OCTOBER_EXPORT = fixture("movements-basic");
const QUARTERLY_MOVEMENTS = parse(QUARTERLY).transactions.length;
const QUARTERLY_LAST4 = parse(QUARTERLY).accountLast4;
const JULY_MOVEMENTS = parse(JULY_EXPORT).transactions.length;

const SAVINGS = {
  bankId: "bancolombia",
  accountType: "savings",
  currency: "COP",
} as const;

const allNew = (total: number) => ({
  total,
  added: total,
  skipped: 0,
  covered: 0,
  hidden: 0,
  replaced: 0,
});

describe.skipIf(!testDatabase)("statement ingestion", () => {
  let app: DbClient;

  const newUser = (): Promise<UserId> =>
    findOrCreateUser(app.db, `test_${randomUUID()}`);

  // A pending job, as the submit action creates it.
  const submit = async (
    userId: UserId,
    content: ExtractedContent,
    pin: Pick<NewIngestionJob, "accountId" | "accountLast4"> = {},
  ): Promise<JobRef> => {
    const parser = findParser(content);
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(
        ctx,
        {
          formatId: parser.ok ? parser.value.id : "unknown",
          extractedContent: content,
          ...pin,
        },
        { limit: 100, month: MONTH },
      ),
    );
    if (!created.ok) throw new Error("No job created.");
    return { jobId: created.value, userId };
  };

  // As the function runs it: claim, then ingest.
  const run = async (job: JobRef) => {
    await claimJob(job);
    return ingestJob(job);
  };

  const accountsOf = (userId: UserId) =>
    withUserContext(app.db, userId, listAccounts);

  const slotsUsedBy = (userId: UserId) =>
    withUserContext(app.db, userId, (ctx) => countSlotsUsed(ctx, MONTH));

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("saves every movement of a first statement, and then has nothing left to do", async () => {
    const userId = await newUser();
    const job = await submit(userId, QUARTERLY);

    expect(await run(job)).toEqual({
      status: "done",
      stats: allNew(QUARTERLY_MOVEMENTS),
    });
    expect(await claimJob(job)).toBe(false);
    expect(await ingestJob(job)).toEqual({ status: "closed" });
    expect(await accountsOf(userId)).toMatchObject([
      { last4: QUARTERLY_LAST4 },
    ]);
    expect(await slotsUsedBy(userId)).toBe(1);
  });

  it("saves each movement with the category the rules give it", async () => {
    const userId = await newUser();
    await run(await submit(userId, QUARTERLY));
    const [account] = await accountsOf(userId);
    const { items } = await withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, {
        accountId: account?.id ?? "",
        limit: 100,
        offset: 0,
      }),
    );
    const byText = Object.fromEntries(
      items.map(({ descriptionRaw, categoryId, isPendingReview }) => [
        descriptionRaw,
        { categoryId, isPendingReview },
      ]),
    );

    expect(byText).toMatchObject({
      "ABONO INTERESES AHORROS": { categoryId: "interest" },
      "IMPTO GOBIERNO 4X1000": { categoryId: "taxes_and_fees" },
      "TRANSFERENCIAS A NEQUI": { categoryId: "transfers_to_people" },
      "COMPRA EN  MERCADO XYZ": { categoryId: "groceries" },
      "COMPRA EN  TIENDA LA ESQUI": { categoryId: "other_spending" },
      "PAGO LLAVE Maria Lopez": {
        categoryId: "transfers_to_people",
        isPendingReview: true,
      },
      "CONSIGNACION CORRESPONSAL CB": {
        categoryId: "own_account_transfer",
        isPendingReview: true,
      },
      "PAGO PSE Banco Ejemplo S": {
        categoryId: "credit_card_payment",
        isPendingReview: true,
      },
      // The holder's own name, which the statement prints: whole words
      // count as moved, a name the bank cut waits for review.
      "TRANSF DE ANA PRUEBA": {
        categoryId: "own_account_transfer",
        isPendingReview: false,
      },
      "TRANSF A ANA MARIA PRUEB": {
        categoryId: "own_account_transfer",
        isPendingReview: true,
      },
      "TRANSF A PEDRO GOMEZ R": { categoryId: "transfers_to_people" },
    });
  });

  it("reads an export's transfers with the holder's name its account kept", async () => {
    const userId = await newUser();
    const accountId = await withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        ...SAVINGS,
        last4: QUARTERLY_LAST4 ?? "8901",
        holderNameNormalized: "ANA MARIA PRUEBA GOMEZ",
      }),
    );
    await run(await submit(userId, JULY_EXPORT, { accountId }));
    const { items } = await withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, { accountId, limit: 100, offset: 0 }),
    );

    expect(
      items.find(({ descriptionRaw }) => descriptionRaw.startsWith("TRANSF A")),
    ).toMatchObject({
      categoryId: "own_account_transfer",
      isPendingReview: true,
    });
  });

  it("adds nothing for a file already loaded, which takes no slot", async () => {
    const userId = await newUser();
    await run(await submit(userId, QUARTERLY));

    expect(await run(await submit(userId, QUARTERLY))).toEqual({
      status: "done",
      stats: {
        ...allNew(QUARTERLY_MOVEMENTS),
        added: 0,
        skipped: QUARTERLY_MOVEMENTS,
      },
    });
    expect(await slotsUsedBy(userId)).toBe(1);
  });

  it("hides an export's movements on a verified quarterly statement's days", async () => {
    const userId = await newUser();
    await run(await submit(userId, QUARTERLY));
    const [account] = await accountsOf(userId);
    // Another account, so the export goes to the quarterly's only by its pin.
    await withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, { ...SAVINGS, last4: "1111" }),
    );

    const outcome = await run(
      await submit(userId, JULY_EXPORT, { accountId: account?.id }),
    );

    expect(outcome).toEqual({
      status: "done",
      stats: { ...allNew(JULY_MOVEMENTS), added: 0, covered: JULY_MOVEMENTS },
    });
  });

  it("saves an export pinned to the digits of an account its upload creates there", async () => {
    const userId = await newUser();
    await withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, { ...SAVINGS, last4: "1111" }),
    );
    await run(
      await submit(userId, JULY_EXPORT, { accountLast4: QUARTERLY_LAST4 }),
    );

    const outcome = await run(await submit(userId, QUARTERLY));

    expect(outcome).toEqual({
      status: "done",
      stats: {
        ...allNew(QUARTERLY_MOVEMENTS),
        added: QUARTERLY_MOVEMENTS - JULY_MOVEMENTS,
        hidden: JULY_MOVEMENTS,
      },
    });
    expect(await accountsOf(userId)).toHaveLength(2);
  });

  it("counts nothing of a statement that doesn't reconcile, until a version that does replaces it", async () => {
    const userId = await newUser();

    expect(await run(await submit(userId, BROKEN_QUARTERLY))).toEqual({
      status: "done",
      stats: { ...allNew(QUARTERLY_MOVEMENTS), added: 0 },
    });
    expect(await run(await submit(userId, QUARTERLY))).toEqual({
      status: "done",
      stats: { ...allNew(QUARTERLY_MOVEMENTS), replaced: 1 },
    });
  });

  it.each([
    {
      order: "the previous quarter first",
      files: [PREVIOUS_QUARTERLY, QUARTERLY],
    },
    {
      order: "the previous quarter last",
      files: [QUARTERLY, PREVIOUS_QUARTERLY],
    },
  ])(
    "chains a quarter to the one before it, uploading $order",
    async ({ files: [first, second] }) => {
      const userId = await newUser();
      const firstJob = await submit(userId, first ?? QUARTERLY);
      await run(firstJob);
      const secondJob = await submit(userId, second ?? QUARTERLY);
      await run(secondJob);

      const results = await withUserContext(app.db, userId, (ctx) =>
        listIngestionJobResults(ctx, [firstJob.jobId, secondJob.jobId]),
      );

      expect(
        new Map(
          results.map(({ statement }) => [
            statement?.period.from,
            statement?.chainedTo,
          ]),
        ),
      ).toEqual(
        new Map([
          ["2026-06-30", { from: "2026-03-31", to: "2026-06-30" }],
          ["2026-03-31", null],
        ]),
      );
    },
  );

  it("gives an export a new account when the user has none", async () => {
    const userId = await newUser();

    const outcome = await run(await submit(userId, OCTOBER_EXPORT));

    expect(outcome).toMatchObject({ status: "done" });
    expect(await accountsOf(userId)).toMatchObject([{ last4: null }]);
  });

  it.each([
    {
      code: "UNKNOWN_FORMAT",
      content: {
        type: "spreadsheet",
        sheets: [{ name: "", rows: [["Lista de mercado"], ["Arroz"]] }],
      },
    },
    { code: "PARSE_FAILED", content: withoutEndMarker(QUARTERLY) },
  ] satisfies { code: string; content: ExtractedContent }[])(
    "fails a job with $code, deleting its content, and frees its slot",
    async ({ code, content }) => {
      const userId = await newUser();
      const job = await submit(userId, content);

      expect(await run(job)).toEqual({ status: "failed", errorCode: code });
      expect(await claimJob(job)).toBe(false);
      expect(await slotsUsedBy(userId)).toBe(0);
    },
  );

  it("fails an export the user has to place among several accounts", async () => {
    const userId = await newUser();
    await withUserContext(app.db, userId, async (ctx) => {
      for (const last4 of ["1111", "2222"])
        await resolveIdentifiedAccount(ctx, { ...SAVINGS, last4 });
    });

    expect(await run(await submit(userId, OCTOBER_EXPORT))).toEqual({
      status: "failed",
      errorCode: "ACCOUNT_REQUIRED",
    });
  });

  it("never claims, ingests or fails another user's job", async () => {
    const owner = await newUser();
    const job = await submit(owner, QUARTERLY);
    const asSomeoneElse = { ...job, userId: await newUser() };

    expect(await claimJob(asSomeoneElse)).toBe(false);
    expect(await ingestJob(asSomeoneElse)).toEqual({ status: "closed" });
    expect(await failJob(asSomeoneElse)).toBe(false);
    expect(await claimJob(job)).toBe(true);
  });

  it("fails a job after the last retry, but never one that finished", async () => {
    const userId = await newUser();
    const open = await submit(userId, QUARTERLY);
    const finished = await submit(userId, OCTOBER_EXPORT);
    await run(finished);

    expect(await failJob(open)).toBe(true);
    expect(await ingestJob(open)).toEqual({ status: "closed" });
    expect(await failJob(finished)).toBe(false);
    expect(await slotsUsedBy(userId)).toBe(1);
  });

  it("throws a database error without the data its message quotes, and keeps the job open", async () => {
    const userId = await newUser();
    const job = await submit(userId, QUARTERLY);
    // As Drizzle throws it: the message lists the query's parameters.
    class DrizzleQueryError extends Error {}
    const violation = Object.assign(new Error("violates check constraint"), {
      code: "23514",
      constraint: "transactions_amount_minor_range",
    });
    vi.mocked(saveStatement).mockRejectedValueOnce(
      new DrizzleQueryError("params: COMPRA EN TIENDA,-4590000", {
        cause: violation,
      }),
    );

    const ingestion = run(job);

    await expect(ingestion).rejects.toThrow(
      /^JOB_NOT_INGESTED: DrizzleQueryError 23514 transactions_amount_minor_range$/,
    );
    await expect(ingestion).rejects.not.toHaveProperty("cause");
    expect(await claimJob(job)).toBe(true);
  });
});
