import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extractedContentSchema } from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  listMovementAccounts,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import { getSummary } from "./summary.service";

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
const THIRD_QUARTER: MovementPeriod = {
  kind: "quarter",
  year: 2026,
  quarter: 3,
};
const FOURTH_QUARTER: MovementPeriod = {
  kind: "quarter",
  year: 2026,
  quarter: 4,
};

const total = (amountMinor: number, count: number) => ({ amountMinor, count });
const NOTHING = total(0, 0);

// Worked out by hand from the fixtures' rows (parsers/scripts/fixture-data.mjs).
// quarterly-basic, July to September: 33 movements, 20 of them out.
const BASIC_KINDS = {
  // Three salaries and Juan Perez's transfer; six savings interest rows and
  // the investment's.
  income: total(1_011_951_882, 11),
  // Five payments to people, two purchases no merchant rule knows, two
  // 4x1000, two withdrawals, a café, the energy bill and the market.
  spending: total(-147_100_000, 14),
  moved: {
    // Three card payments (one by PSE to a bank), the investment, and two
    // transfers to the holder's cut name.
    out: total(-388_000_000, 6),
    // The deposit at a corresponsal and the transfer from the holder's name.
    back: total(60_000_000, 2),
  },
};

// movements-overlap: the same July as an export, interest one day later.
const JULY_EXPORT_KINDS = {
  income: total(320_000_957, 5),
  spending: total(-38_920_000, 5),
  moved: { out: total(-180_000_000, 3), back: total(15_000_000, 1) },
};

// A fixture as the browser sends it: minimized by its parser.
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

describe.skipIf(!testDatabase)("an account's summary", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // A user who uploaded the fixtures in this order, as the action and the
  // function do it, and the account they landed in.
  const userWith = async (names: readonly string[]) => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    for (const name of names) {
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
    }
    const [account] = await withUserContext(app.db, userId, (ctx) =>
      listMovementAccounts(ctx),
    );
    if (!account) throw new Error("No account.");
    return { clerkUserId, accountId: account.id };
  };

  // The figures of the period the URL asks.
  const summaryOf = async (
    names: readonly string[],
    period = THIRD_QUARTER,
  ) => {
    const { clerkUserId, accountId } = await userWith(names);
    const result = await getSummary(clerkUserId, { accountId, period });
    if (!result) throw new Error("No summary.");
    const { summary, balance, bankFigures, unreconciled } = result;
    return { summary, balance, bankFigures, unreconciled };
  };

  it("adds up a quarterly statement's quarter", async () => {
    const { summary, balance, bankFigures, unreconciled } = await summaryOf([
      "quarterly-basic",
    ]);

    expect(summary.outflows).toEqual(total(-535_100_000, 20));
    expect(summary.kinds).toEqual(BASIC_KINDS);
    expect(summary.spendingByCategory).toEqual([
      { categoryId: "cash_withdrawal", ...total(-50_000_000, 2) },
      { categoryId: "transfers_to_people", ...total(-41_000_000, 5) },
      { categoryId: "groceries", ...total(-23_015_000, 1) },
      { categoryId: "utilities", ...total(-18_543_000, 1) },
      { categoryId: "other_spending", ...total(-11_320_000, 2) },
      { categoryId: "restaurants", ...total(-1_850_000, 1) },
      { categoryId: "taxes_and_fees", ...total(-1_372_000, 2) },
    ]);
    expect(summary.incomeByCategory).toEqual([
      { categoryId: "income_transfer", ...total(1_010_000_000, 4) },
      { categoryId: "interest", ...total(1_951_882, 7) },
    ]);
    expect(summary.movedByCategory).toEqual([
      {
        categoryId: "credit_card_payment",
        out: total(-258_000_000, 3),
        back: NOTHING,
      },
      { categoryId: "investment", out: total(-100_000_000, 1), back: NOTHING },
      {
        categoryId: "own_account_transfer",
        out: total(-30_000_000, 2),
        back: total(60_000_000, 2),
      },
    ]);
    expect(summary.interest).toEqual(total(1_951_882, 7));
    expect(summary.gmfTax).toEqual(total(-1_372_000, 2));
    expect(summary.cash).toEqual(total(-50_000_000, 2));
    expect(summary.cardPayments).toEqual(total(-258_000_000, 3));
    expect(summary.days).toHaveLength(26);
    expect(summary.days[0]).toEqual({
      date: "2026-07-01",
      kinds: {
        income: total(289, 1),
        spending: total(-2_000_000, 1),
        moved: { out: total(-35_000_000, 1), back: NOTHING },
      },
    });
    // The bank's own: its average balance, and the savings interest alone.
    expect(bankFigures).toEqual([
      {
        period: { from: "2026-06-30", to: "2026-09-30" },
        averageBalanceMinor: 513_425_900,
        interestMinor: 1_882,
        movementCount: 33,
        chainedTo: null,
      },
    ]);
    // After the quarter's last movement, its interest on the 30th.
    expect(balance).toEqual({ date: "2026-09-30", amountMinor: 781_851_882 });
    expect(unreconciled).toEqual([]);
  });

  it("leaves out a statement that doesn't reconcile on another quarter's days", async () => {
    const { unreconciled } = await summaryOf(
      ["quarterly-broken-balance", "movements-basic"],
      FOURTH_QUARTER,
    );

    expect(unreconciled).toEqual([]);
  });

  it("finds the quarter a verified statement chains on to", async () => {
    const { bankFigures } = await summaryOf([
      "quarterly-previous",
      "quarterly-basic",
    ]);

    expect(bankFigures[0]?.chainedTo).toEqual({
      from: "2026-03-31",
      to: "2026-06-30",
    });
  });

  it("counts July once when its export comes after the quarterly statement", async () => {
    const alone = await summaryOf(["quarterly-basic"]);

    expect(await summaryOf(["quarterly-basic", "movements-overlap"])).toEqual(
      alone,
    );
  });

  it("counts only the export on the days of a quarterly statement that doesn't reconcile", async () => {
    const { summary, balance, bankFigures, unreconciled } = await summaryOf([
      "quarterly-broken-balance",
      "movements-overlap",
    ]);

    // The export prints no balances, and the statement that does is broken.
    expect(balance).toBeNull();
    expect(unreconciled).toHaveLength(1);
    expect(unreconciled[0]?.period).toEqual({
      from: "2026-06-30",
      to: "2026-09-30",
    });

    expect(summary.outflows).toEqual(total(-218_920_000, 8));
    expect(summary.kinds).toEqual(JULY_EXPORT_KINDS);
    expect(summary.days.map(({ date }) => date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-05",
      "2026-07-10",
      "2026-07-15",
      "2026-07-20",
      "2026-07-28",
      "2026-07-31",
    ]);
    expect(bankFigures).toEqual([]);
  });

  it("adds up a week of movements without a quarterly statement", async () => {
    const { summary, bankFigures } = await summaryOf(
      ["movements-basic"],
      FOURTH_QUARTER,
    );

    expect(summary.outflows).toEqual(total(-64_852_050, 9));
    expect(summary.kinds).toEqual({
      income: total(320_003_017, 8),
      spending: total(-64_852_050, 9),
      moved: { out: NOTHING, back: NOTHING },
    });
    expect(summary.spendingByCategory).toEqual([
      // The energy bill by PSE and the gas bill written as a transfer.
      { categoryId: "utilities", ...total(-20_877_000, 2) },
      { categoryId: "cash_withdrawal", ...total(-20_000_000, 1) },
      { categoryId: "transfers_to_people", ...total(-13_500_000, 3) },
      { categoryId: "groceries", ...total(-8_425_050, 1) },
      { categoryId: "restaurants", ...total(-1_200_000, 1) },
      { categoryId: "other_spending", ...total(-850_000, 1) },
    ]);
    expect(summary.movedByCategory).toEqual([]);
    expect(summary.gmfTax).toEqual(NOTHING);
    expect(summary.cardPayments).toEqual(NOTHING);
    // The export dates interest a day later: none on the 1st, two on the 7th.
    expect(summary.days.at(-1)).toEqual({
      date: "2026-10-07",
      kinds: {
        income: total(320_000_982, 3),
        spending: total(-8_425_050, 1),
        moved: { out: NOTHING, back: NOTHING },
      },
    });
    expect(bankFigures).toEqual([]);
  });

  it("opens on the latest quarter when the URL asks for none, and adds up only its days", async () => {
    const { clerkUserId, accountId } = await userWith([
      "quarterly-basic",
      "movements-basic",
    ]);

    const result = await getSummary(clerkUserId, {});

    expect(result?.account.id).toBe(accountId);
    expect(result?.period).toEqual(FOURTH_QUARTER);
    // October's week alone, not July to September.
    expect(result?.summary.outflows).toEqual(total(-64_852_050, 9));
  });

  it("opens the user's own account when the URL names another user's", async () => {
    const owner = await userWith(["movements-basic"]);
    const stranger = await userWith(["movements-basic"]);

    const result = await getSummary(stranger.clerkUserId, {
      accountId: owner.accountId,
      period: FOURTH_QUARTER,
    });

    expect(result?.account.id).toBe(stranger.accountId);
  });

  it("reads nothing for a user without movements", async () => {
    expect(await getSummary(`test_${randomUUID()}`, {})).toBeNull();
  });
});
