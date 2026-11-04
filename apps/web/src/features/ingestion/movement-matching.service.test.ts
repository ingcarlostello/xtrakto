import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  categorizeStatement,
  type ExtractedContent,
  extractedContentSchema,
  hashIdentifier,
  normalizeHolderName,
  type ParsedStatement,
  parsedStatementSchema,
  prepareStatement,
} from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  dismissReview,
  findMovementDetail,
  findOrCreateUser,
  listAccounts,
  listMatchCandidates,
  listTransactions,
  resolveIdentifiedAccount,
  saveStatement,
  saveUserCategoryRule,
  setUserCategory,
  type TransactionListItem,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { balanceCheckOf } from "@/utils/balance-check.helpers";
import { claimJob, ingestJob } from "./ingest-statement.service";
import { matchAccountMovements } from "./movement-matching.service";

// Against the test database, as the application role. Each test creates its
// own user.
const database = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/lib/db", () => ({ getDb: () => database.current }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    IDENTIFIER_HASH_KEY: "test-key-with-at-least-32-characters!",
  }),
}));

const HASH_KEY = "test-key-with-at-least-32-characters!";
const FIXTURES = new URL(
  "../../../../../packages/parsers/fixtures/",
  import.meta.url,
);
const HOUR_MS = 3_600_000;
const MONTH = {
  start: new Date(Date.now() - HOUR_MS),
  end: new Date(Date.now() + HOUR_MS),
};
const NEQUI = "TRANSFERENCIAS A NEQUI";
const PSE_TO_A_BANK = "PAGO PSE Banco Ejemplo S";
const CORRESPONSAL = "CONSIGNACION CORRESPONSAL CB";

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

const QUARTERLY = fixture("quarterly-basic");
const BROKEN_QUARTERLY = fixture("quarterly-broken-balance");
const JULY_EXPORT = fixture("movements-overlap");
const OCTOBER_EXPORT = fixture("movements-basic");
const QUARTERLY_MOVEMENTS = parse(QUARTERLY).transactions.length;
const JULY_MOVEMENTS = parse(JULY_EXPORT).transactions.length;

// The fixtures' holder, whose name the rules of the holder's name read.
const HOLDER_NAME = normalizeHolderName("ANA MARIA PRUEBA GOMEZ");

type Line = {
  readonly date: string;
  readonly description: string;
  readonly amount: number;
  readonly phone?: string;
  readonly code?: string;
};

const referenceOf = ({ phone, code }: Line) => {
  if (phone !== undefined)
    return { referenceKind: "phone", referenceRaw: phone };
  return code === undefined
    ? { referenceKind: "none" }
    : { referenceKind: "code", referenceRaw: code };
};

const movementOf = (line: Line, sourceRow: number) => ({
  date: line.date,
  descriptionRaw: line.description,
  descriptionNormalized: line.description,
  amountMinor: line.amount,
  sourceRow,
  ...referenceOf(line),
});

// July to September 2026, each movement with its running balance.
const quarterOf = (lines: readonly Line[]): ParsedStatement => {
  let balance = 1_000_000;
  const transactions = lines.map((line, index) => {
    balance += line.amount;
    return { ...movementOf(line, index), balanceAfterMinor: balance };
  });
  return parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: "bancolombia-savings-quarterly",
    accountType: "savings",
    accountLast4: "8901",
    currency: "COP",
    period: { from: "2026-06-30", to: "2026-09-30" },
    periodSource: "statement",
    openingBalanceMinor: 1_000_000,
    closingBalanceMinor: balance,
    transactions,
    warnings: [],
  });
};

const exportOf = (lines: readonly Line[]): ParsedStatement => {
  const dates = lines.map(({ date }) => date).sort();
  return parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: "bancolombia-movements-export",
    accountType: "savings",
    currency: "COP",
    period: { from: dates[0], to: dates[dates.length - 1] },
    periodSource: "rows",
    transactions: lines.map(movementOf),
    warnings: [],
  });
};

describe.skipIf(!testDatabase)("matching movements across formats", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const newUser = (): Promise<UserId> =>
    findOrCreateUser(app.db, `test_${randomUUID()}`);

  // A file as the upload screen sends it, and the function runs it.
  const upload = async (userId: UserId, content: ExtractedContent) => {
    const parser = findParser(content);
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(
        ctx,
        {
          formatId: parser.ok ? parser.value.id : "unknown",
          extractedContent: content,
        },
        { limit: 100, month: MONTH },
      ),
    );
    if (!created.ok) throw new Error("No job created.");
    const job = { jobId: created.value, userId };
    await claimJob(job);
    return ingestJob(job);
  };

  // A statement saved as ingestion saves it, but without matching, as
  // before 10.1a.
  const saveUnmatched = (
    userId: UserId,
    accountId: string,
    parsed: ParsedStatement,
  ) =>
    withUserContext(app.db, userId, async (ctx) =>
      saveStatement(ctx, {
        accountId,
        statement: categorizeStatement(
          await prepareStatement(parsed, HASH_KEY),
          { holderName: HOLDER_NAME },
        ),
        balance: balanceCheckOf(parsed),
      }),
    );

  const newAccount = async (userId: UserId) =>
    withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        currency: "COP",
        last4: "8901",
      }),
    );

  const accountOf = async (userId: UserId): Promise<string> => {
    const [account] = await withUserContext(app.db, userId, listAccounts);
    return account?.id ?? "";
  };

  const countedOf = async (userId: UserId, accountId: string) =>
    (
      await withUserContext(app.db, userId, (ctx) =>
        listTransactions(ctx, { accountId, offset: 0 }),
      )
    ).items;

  const unmatchedOf = (userId: UserId, accountId: string) =>
    withUserContext(app.db, userId, (ctx) =>
      listMatchCandidates(ctx, accountId),
    );

  const detailOf = (
    userId: UserId,
    accountId: string,
    movement: TransactionListItem | undefined,
  ) =>
    withUserContext(app.db, userId, (ctx) =>
      findMovementDetail(ctx, { accountId, movementId: movement?.id ?? "" }),
    );

  // A movement of July 1st, as the bank wrote it.
  const firstOfJuly =
    (description: string) =>
    ({ date, descriptionRaw }: TransactionListItem) =>
      date === "2026-07-01" && descriptionRaw === description;

  it.each([
    { order: "the quarterly statement first", files: [QUARTERLY, JULY_EXPORT] },
    { order: "the export first", files: [JULY_EXPORT, QUARTERLY] },
  ])(
    "matches every export movement on the statement's days, interest a day apart, uploading $order",
    async ({ files }) => {
      const userId = await newUser();
      for (const file of files) await upload(userId, file);
      const accountId = await accountOf(userId);

      expect(await unmatchedOf(userId, accountId)).toEqual({
        hidden: [],
        counted: [],
      });
      const counted = await countedOf(userId, accountId);
      expect(counted).toHaveLength(QUARTERLY_MOVEMENTS);
      expect(
        await detailOf(userId, accountId, counted.find(firstOfJuly(NEQUI))),
      ).toMatchObject({
        referenceLast4: "4567",
        referenceKind: "phone",
        categoryId: "transfers_to_people",
        categoryRuleId: "nequi_out_number",
        isPendingReview: true,
      });
    },
  );

  it("matches nothing with a quarterly statement that doesn't reconcile", async () => {
    const userId = await newUser();
    await upload(userId, BROKEN_QUARTERLY);
    await upload(userId, JULY_EXPORT);
    const accountId = await accountOf(userId);

    expect(await unmatchedOf(userId, accountId)).toEqual({
      hidden: [],
      counted: [],
    });
    expect(await countedOf(userId, accountId)).toHaveLength(JULY_MOVEMENTS);
  });

  it("matches a text the statement cut and identical movements in order, and keeps hidden what has no twin", async () => {
    const userId = await newUser();
    const accountId = await newAccount(userId);
    const send = { date: "2026-07-20", description: NEQUI, amount: -10_000 };
    await saveUnmatched(
      userId,
      accountId,
      quarterOf([
        {
          date: "2026-07-15",
          description: "PAGO LLAVE COMIDAS R",
          amount: -1_500,
        },
        send,
        send,
      ]),
    );
    await saveUnmatched(
      userId,
      accountId,
      exportOf([
        {
          date: "2026-07-15",
          description: "PAGO LLAVE COMIDAS RÁ",
          amount: -1_500,
        },
        { ...send, phone: "3001112222" },
        { ...send, phone: "3003334444" },
        { date: "2026-07-25", description: "COMPRA EN TIENDA", amount: -300 },
      ]),
    );

    expect(
      await withUserContext(app.db, userId, (ctx) =>
        matchAccountMovements(ctx, accountId, { userRules: [] }),
      ),
    ).toBe(3);
    const { hidden } = await unmatchedOf(userId, accountId);
    expect(
      hidden.map(({ descriptionNormalized }) => descriptionNormalized),
    ).toEqual(["COMPRA EN TIENDA"]);
    // The first send of the day, with the higher balance after it, first.
    const sends = (await countedOf(userId, accountId))
      .filter(({ descriptionRaw }) => descriptionRaw === NEQUI)
      .sort(
        (a, b) => Number(b.balanceAfterMinor) - Number(a.balanceAfterMinor),
      );
    const last4s = await Promise.all(
      sends.map(
        async (movement) =>
          (await detailOf(userId, accountId, movement))?.referenceLast4,
      ),
    );
    expect(last4s).toEqual(["2222", "4444"]);
  });

  it("reads the holder's name when a key payment to it gets its code", async () => {
    const userId = await newUser();
    const accountId = await newAccount(userId);
    const toMyself = {
      date: "2026-08-12",
      description: "PAGO LLAVE ANA MARIA PRUEBA",
      amount: -6_000,
    };
    await saveUnmatched(userId, accountId, quarterOf([toMyself]));
    await saveUnmatched(
      userId,
      accountId,
      exportOf([{ ...toMyself, code: "0099887766" }]),
    );

    await withUserContext(app.db, userId, (ctx) =>
      matchAccountMovements(ctx, accountId, {
        holderName: HOLDER_NAME,
        userRules: [],
      }),
    );

    const [payment] = await countedOf(userId, accountId);
    expect(await detailOf(userId, accountId, payment)).toMatchObject({
      referenceLast4: "7766",
      categoryId: "own_account_transfer",
      categoryRuleId: "own_name_key",
    });
  });

  it("keeps a «No sé» and a category chosen for one movement, uploading the quarterly statement first", async () => {
    const userId = await newUser();
    await upload(userId, QUARTERLY);
    const accountId = await accountOf(userId);
    const counted = await countedOf(userId, accountId);
    const pse = counted.find(firstOfJuly(PSE_TO_A_BANK));
    const send = counted.find(firstOfJuly(NEQUI));
    await withUserContext(app.db, userId, async (ctx) => {
      await dismissReview(ctx, [pse?.id ?? ""]);
      await setUserCategory(ctx, {
        movementIds: [send?.id ?? ""],
        categoryId: "groceries",
      });
    });

    await upload(userId, JULY_EXPORT);

    expect(await detailOf(userId, accountId, pse)).toMatchObject({
      referenceLast4: "5678",
      categoryRuleId: "pse_card",
      isPendingReview: false,
    });
    expect(await detailOf(userId, accountId, send)).toMatchObject({
      referenceLast4: "4567",
      categoryId: "groceries",
      categorySource: "user",
      isPendingReview: false,
    });
  });

  it("gives the statement's movements what the user answered for the export's alone, uploading the export first", async () => {
    const userId = await newUser();
    await upload(userId, JULY_EXPORT);
    const accountId = await accountOf(userId);
    const exported = await countedOf(userId, accountId);
    await withUserContext(app.db, userId, async (ctx) => {
      await dismissReview(ctx, [
        exported.find(firstOfJuly(PSE_TO_A_BANK))?.id ?? "",
      ]);
      await setUserCategory(ctx, {
        movementIds: [
          exported.find(({ descriptionRaw }) => descriptionRaw === CORRESPONSAL)
            ?.id ?? "",
        ],
        categoryId: "deposit",
      });
    });

    await upload(userId, QUARTERLY);

    const counted = await countedOf(userId, accountId);
    expect(
      await detailOf(
        userId,
        accountId,
        counted.find(firstOfJuly(PSE_TO_A_BANK)),
      ),
    ).toMatchObject({ categoryRuleId: "pse_card", isPendingReview: false });
    expect(
      await detailOf(
        userId,
        accountId,
        counted.find(({ descriptionRaw }) => descriptionRaw === CORRESPONSAL),
      ),
    ).toMatchObject({
      categoryId: "deposit",
      categorySource: "user",
      isPendingReview: false,
    });
  });

  it("gives a send the user's category for a number they marked as theirs", async () => {
    const userId = await newUser();
    await withUserContext(app.db, userId, async (ctx) =>
      saveUserCategoryRule(ctx, {
        target: "reference",
        referenceHash: await hashIdentifier("3001234567", HASH_KEY),
        referenceLast4: "4567",
        categoryId: "own_account_transfer",
      }),
    );

    await upload(userId, QUARTERLY);
    await upload(userId, JULY_EXPORT);

    const accountId = await accountOf(userId);
    expect(
      await detailOf(
        userId,
        accountId,
        (await countedOf(userId, accountId)).find(firstOfJuly(NEQUI)),
      ),
    ).toMatchObject({
      categoryId: "own_account_transfer",
      categorySource: "user",
      isPendingReview: false,
    });
  });

  it("matches what was saved before with the account's next upload", async () => {
    const userId = await newUser();
    const accountId = await newAccount(userId);
    await saveUnmatched(userId, accountId, parse(QUARTERLY));
    await saveUnmatched(userId, accountId, parse(JULY_EXPORT));
    expect((await unmatchedOf(userId, accountId)).hidden).toHaveLength(
      JULY_MOVEMENTS,
    );

    await upload(userId, OCTOBER_EXPORT);

    expect(await unmatchedOf(userId, accountId)).toEqual({
      hidden: [],
      counted: [],
    });
  });
});
