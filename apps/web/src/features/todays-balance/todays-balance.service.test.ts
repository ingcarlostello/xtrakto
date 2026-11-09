import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  amountMinorSchema,
  extractedContentSchema,
  localDateSchema,
} from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  listMovementAccounts,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import {
  keepTodaysBalance,
  readBalanceCheck,
  readTodaysBalanceOffer,
} from "./todays-balance.service";

// Against the test database, as the application role, after real uploads.
const database = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/lib/db", () => ({ getDb: () => database.current }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    IDENTIFIER_HASH_KEY: "test-key-with-at-least-32-characters!",
  }),
}));

const FIXTURES = new URL(
  "../../../../../packages/parsers/fixtures/",
  import.meta.url,
);
const HOUR_MS = 3_600_000;
const day = (date: string) => localDateSchema.parse(date);
const amount = (value: number) => amountMinorSchema.parse(value);

// quarterly-basic closes on 30 September with $7.818.518,82, and
// movements-basic's first week of October adds up to $2.551.509,67.
const CLOSING = 781_851_882;
const OCTOBER_WEEK = 255_150_967;
const ADDS_UP = amount(CLOSING + OCTOBER_WEEK);
// The day after the export's last movement, in Bogotá.
const TODAY = day("2026-10-08");
const OCTOBER_FILE = {
  from: day("2026-10-01"),
  to: day("2026-10-07"),
};

const fixture = (name: string) => {
  const json: unknown = JSON.parse(
    readFileSync(new URL(`${name}.json`, FIXTURES), "utf8"),
  );
  const content = extractedContentSchema.parse(json);
  const parser = findParser(content);
  if (!parser.ok) throw new Error(`No parser recognizes ${name}.`);
  return {
    formatId: parser.value.id,
    extractedContent: parser.value.minimize(content),
  };
};

describe.skipIf(!testDatabase)("today's balance", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const upload = async (userId: UserId, name: string) => {
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(ctx, fixture(name), {
        limit: 100,
        month: {
          start: new Date(Date.now() - HOUR_MS),
          end: new Date(Date.now() + HOUR_MS),
        },
      }),
    );
    if (!created.ok) throw new Error("No job created.");
    await claimJob({ jobId: created.value, userId });
    await ingestJob({ jobId: created.value, userId });
  };

  // A user who uploaded the fixtures in this order, and their account.
  const userWith = async (names: readonly string[]) => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    for (const name of names) await upload(userId, name);
    const [account] = await withUserContext(app.db, userId, (ctx) =>
      listMovementAccounts(ctx),
    );
    if (!account) throw new Error("No account.");
    return { clerkUserId, userId, accountId: account.id };
  };

  type Someone = Awaited<ReturnType<typeof userWith>>;

  const checkOf = ({ userId, accountId }: Someone) =>
    withUserContext(app.db, userId, (ctx) => readBalanceCheck(ctx, accountId));

  const offerOf = ({ userId, accountId }: Someone, to = OCTOBER_FILE.to) =>
    withUserContext(app.db, userId, (ctx) =>
      readTodaysBalanceOffer(
        ctx,
        { accountId, period: { ...OCTOBER_FILE, to } },
        TODAY,
      ),
    );

  const BOTH = ["quarterly-basic", "movements-basic"];

  it("says a balance adds up with the last closing and the movements since", async () => {
    const ana = await userWith(BOTH);

    const answer = await keepTodaysBalance(
      ana.clerkUserId,
      ana.accountId,
      ADDS_UP,
    );

    expect(answer).toEqual({
      ok: true,
      value: { status: "adds_up", date: "2026-10-08", amountMinor: ADDS_UP },
    });
    const check = await checkOf(ana);
    expect(check).toMatchObject({
      status: "adds_up",
      closingDate: "2026-09-30",
    });
    // Each day with movements, the last one on the balance typed.
    expect(check?.status === "adds_up" && check.days.at(-1)).toMatchObject({
      date: "2026-10-07",
      closingMinor: ADDS_UP,
    });
  });

  it("dates a balance by today in Bogotá", async () => {
    // 8 October at 22:00 in Bogotá, already the 9th in UTC.
    vi.setSystemTime(new Date("2026-10-09T03:00:00Z"));
    const ana = await userWith(BOTH);

    const answer = await keepTodaysBalance(
      ana.clerkUserId,
      ana.accountId,
      ADDS_UP,
    );

    expect(answer).toMatchObject({ value: { date: "2026-10-08" } });
  });

  it("says by how much a balance is off", async () => {
    const ana = await userWith(BOTH);

    const answer = await keepTodaysBalance(
      ana.clerkUserId,
      ana.accountId,
      amount(ADDS_UP - 1_240_000),
    );

    expect(answer).toEqual({
      ok: true,
      value: { status: "off", differenceMinor: -1_240_000 },
    });
  });

  it("checks what a later upload brought, when read", async () => {
    // Without October's week the balance is off by all of it.
    const ana = await userWith(["quarterly-basic"]);
    await keepTodaysBalance(ana.clerkUserId, ana.accountId, ADDS_UP);
    expect(await checkOf(ana)).toMatchObject({
      status: "off",
      differenceMinor: OCTOBER_WEEK,
    });

    await upload(ana.userId, "movements-basic");

    expect(await checkOf(ana)).toMatchObject({ status: "adds_up" });
  });

  it("has nothing to compare without a quarterly statement before", async () => {
    const ana = await userWith(["movements-basic"]);

    const answer = await keepTodaysBalance(
      ana.clerkUserId,
      ana.accountId,
      ADDS_UP,
    );

    expect(answer).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await checkOf(ana)).toBeUndefined();
    expect(await offerOf(ana)).toBeUndefined();
  });

  it("leaves a balance alone once a quarterly statement covers its day", async () => {
    const ana = await userWith(BOTH);
    await keepTodaysBalance(ana.clerkUserId, ana.accountId, ADDS_UP);

    // Closes after the day typed, so its own balances speak for that day.
    await upload(ana.userId, "quarterly-year-rollover");

    expect(await checkOf(ana)).toBeUndefined();
  });

  it("offers the field to a file that reaches today after a verified closing", async () => {
    const ana = await userWith(BOTH);

    expect(await offerOf(ana)).toEqual({ accountId: ana.accountId });
    // Its last movement of today, too.
    expect(await offerOf(ana, TODAY)).toEqual({ accountId: ana.accountId });
  });

  it("offers no field to a file that ends the day the last statement closes", async () => {
    const ana = await userWith(BOTH);

    const offer = await withUserContext(app.db, ana.userId, (ctx) =>
      readTodaysBalanceOffer(
        ctx,
        {
          accountId: ana.accountId,
          period: { from: day("2026-09-01"), to: day("2026-09-30") },
        },
        day("2026-10-01"),
      ),
    );

    expect(offer).toBeUndefined();
  });

  it("offers no field to a file that doesn't reach today", async () => {
    const ana = await userWith(BOTH);

    expect(await offerOf(ana, day("2026-10-06"))).toBeUndefined();
  });

  it("offers no field to a file a verified quarterly statement covers", async () => {
    const ana = await userWith(BOTH);
    await upload(ana.userId, "quarterly-year-rollover");

    expect(await offerOf(ana)).toBeUndefined();
  });

  it("answers with today's balance, and asks again another day", async () => {
    const ana = await userWith(BOTH);
    await keepTodaysBalance(ana.clerkUserId, ana.accountId, ADDS_UP);

    expect(await offerOf(ana)).toEqual({
      accountId: ana.accountId,
      answer: { status: "adds_up", date: "2026-10-08", amountMinor: ADDS_UP },
    });

    vi.setSystemTime(new Date("2026-10-09T15:00:00Z"));
    expect(
      await withUserContext(app.db, ana.userId, (ctx) =>
        readTodaysBalanceOffer(
          ctx,
          { accountId: ana.accountId, period: OCTOBER_FILE },
          day("2026-10-08"),
        ),
      ),
    ).toMatchObject({ answer: { status: "adds_up" } });
    expect(
      await withUserContext(app.db, ana.userId, (ctx) =>
        readTodaysBalanceOffer(
          ctx,
          {
            accountId: ana.accountId,
            period: { ...OCTOBER_FILE, to: day("2026-10-09") },
          },
          day("2026-10-09"),
        ),
      ),
    ).toEqual({ accountId: ana.accountId });
  });

  it("keeps a balance only on the user's own account", async () => {
    const owner = await userWith(BOTH);
    const stranger = await userWith(["movements-basic"]);

    const answer = await keepTodaysBalance(
      stranger.clerkUserId,
      owner.accountId,
      ADDS_UP,
    );

    expect(answer).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await checkOf(owner)).toBeUndefined();
  });

  it("finds nothing for a user who never uploaded", async () => {
    expect(
      await keepTodaysBalance(`test_${randomUUID()}`, randomUUID(), ADDS_UP),
    ).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
