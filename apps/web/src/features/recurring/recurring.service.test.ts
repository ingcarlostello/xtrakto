import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  type CalendarMonth,
  type ExtractedContent,
  extractedContentSchema,
} from "@xtrakto/core";
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
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import { getRecurringPayments } from "./recurring.service";

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
const DAY_MS = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

// The fixed payments of quarterly-year-rollover, the largest first.
const SPENDING = [
  "Financiera Andes S",
  "EMPRESA DE ENERGIA",
  "HOGAR CONECTADO SA",
  "GIMNASIO FIT",
  "Acueducto Municipa",
  "Telefonia Movil",
  "GAS NATURAL CIUDAD",
];
const MOVED = ["AHORRO DOLAR", "TC MASTER PESOS"];

// Content as the browser sends it: minimized by its parser.
const minimized = (content: ExtractedContent) => {
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes the content.");
  return {
    formatId: parser.value.id,
    extractedContent: parser.value.minimize(content),
  };
};

const fixture = (name: string) =>
  minimized(
    extractedContentSchema.parse(
      JSON.parse(readFileSync(new URL(`${name}.json`, FIXTURES), "utf8")),
    ),
  );

type ExportRow = readonly [day: number, description: string, pesos: number];

// A month's movements, as the movements export writes them: each day's
// midnight in Bogotá stored as 05:00 UTC, amounts in pesos.
const monthExport = (
  { year, month }: CalendarMonth,
  rows: readonly ExportRow[],
) =>
  minimized(
    extractedContentSchema.parse({
      type: "spreadsheet",
      sheets: [
        {
          name: "Hoja1",
          rows: [
            ["Fecha", "Descripción", "Referencia", "Valor"],
            ...rows.map(([day, description, pesos]) => [
              {
                excelSerial:
                  (Date.UTC(year, month - 1, day) - EXCEL_EPOCH) / DAY_MS +
                  5 / 24,
              },
              description,
              null,
              pesos,
            ]),
          ],
        },
      ],
    }),
  );

// The month after quarterly-year-rollover.
const aprilExport = (rows: readonly ExportRow[]) =>
  monthExport({ year: 2027, month: 4 }, rows);

// April's fixed payments to the 6th: internet, due on the 5th, didn't come.
const APRIL_TO_THE_6TH: readonly ExportRow[] = [
  [2, "PAGO PSE Financiera Andes S", -1_540_000],
  [3, "PAGO PSE EMPRESA DE ENERGIA", -170_000],
  [4, "PAGO PSE Financiera Andes S", -311_000],
  [4, "PAGO LLAVE AHORRO DOLAR", -2_000_000],
  [6, "PAGO SUC VIRT TC MASTER PESOS", -1_500_000],
];

// The rest of April, to its last day: all but the gym.
const REST_OF_APRIL: readonly ExportRow[] = [
  [5, "PAGO PSE HOGAR CONECTADO SA", -129_900],
  [11, "PAGO PSE GAS NATURAL CIUDAD", -30_990],
  [19, "PAGO PSE Acueducto Municipa", -97_000],
  [22, "PAGO QR Telefonia Movil", -62_000],
  [30, "ABONO INTERESES AHORROS", 4.32],
];

const labels = (payments: readonly { label: string }[]) =>
  payments.map(({ label }) => label);

describe.skipIf(!testDatabase)("an account's payments that repeat", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // A user who uploaded files in order, as the action and the function do it.
  const userWith = async (
    ...uploads: readonly ReturnType<typeof fixture>[]
  ) => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    for (const upload of uploads) {
      const created = await withUserContext(app.db, userId, (ctx) =>
        createIngestionJobWithinLimit(ctx, upload, {
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

  it("finds the fixed payments of the latest quarter's last month", async () => {
    const { clerkUserId } = await userWith(fixture("quarterly-year-rollover"));

    const recurring = await getRecurringPayments(clerkUserId, {});

    expect(recurring?.period).toEqual({
      kind: "quarter",
      year: 2027,
      quarter: 1,
    });
    expect(recurring?.month).toEqual({ year: 2027, month: 3 });
    expect(labels(recurring?.payments.spending ?? [])).toEqual(SPENDING);
    expect(labels(recurring?.payments.moved ?? [])).toEqual(MOVED);
    expect(recurring?.stopped).toEqual([]);
    const [loan, energy] = recurring?.payments.spending ?? [];
    expect(loan?.months.at(-1)?.payments).toEqual([-154_000_000, -31_100_000]);
    expect(energy?.trend).toEqual({ kind: "rose", percent: 12 });
    expect(recurring?.payments.spending.at(-1)?.channels).toEqual([
      "transfer",
      "pse",
    ]);
  });

  it("finds in a month only what repeated three months by then", async () => {
    const { clerkUserId } = await userWith(fixture("quarterly-year-rollover"));
    const inMonth = (month: number) =>
      getRecurringPayments(clerkUserId, {
        period: { kind: "month", year: 2027, month },
      });

    const march = await inMonth(3);
    // The statement starts in January: by February, two months only.
    const february = await inMonth(2);

    expect(march?.month).toEqual({ year: 2027, month: 3 });
    expect(labels(march?.payments.spending ?? [])).toEqual(SPENDING);
    expect(february?.month).toEqual({ year: 2027, month: 2 });
    expect(february?.payments).toEqual({ spending: [], moved: [] });
  });

  it("stops a fixed payment that didn't come in a whole month", async () => {
    const { clerkUserId } = await userWith(
      fixture("quarterly-year-rollover"),
      aprilExport([...APRIL_TO_THE_6TH, ...REST_OF_APRIL]),
    );

    const recurring = await getRecurringPayments(clerkUserId, {});

    expect(recurring?.month).toEqual({ year: 2027, month: 4 });
    expect(labels(recurring?.payments.spending ?? [])).toEqual(
      SPENDING.filter((label) => label !== "GIMNASIO FIT"),
    );
    expect(labels(recurring?.payments.moved ?? [])).toEqual(MOVED);
    expect(labels(recurring?.stopped ?? [])).toEqual(["GIMNASIO FIT"]);
  });

  it("still expects last month's payments while the month's movements go on", async () => {
    const { clerkUserId } = await userWith(
      fixture("quarterly-year-rollover"),
      aprilExport(APRIL_TO_THE_6TH),
    );

    const recurring = await getRecurringPayments(clerkUserId, {});

    expect(recurring?.month).toEqual({ year: 2027, month: 4 });
    expect(labels(recurring?.payments.spending ?? [])).toEqual(SPENDING);
    expect(recurring?.stopped).toEqual([]);
  });

  it("finds a year's payments by its last month, with the months before the year (10.2c)", async () => {
    // A loan paid from November to January.
    const loan: readonly ExportRow[] = [
      [2, "PAGO PSE Financiera Andes S", -1_540_000],
    ];
    const { clerkUserId } = await userWith(
      monthExport({ year: 2026, month: 11 }, loan),
      monthExport({ year: 2026, month: 12 }, loan),
      monthExport({ year: 2027, month: 1 }, loan),
    );
    const inYear = (year: number) =>
      getRecurringPayments(clerkUserId, { period: { kind: "year", year } });

    const january = await inYear(2027);
    // By December, two months only.
    const december = await inYear(2026);

    expect(january?.period).toEqual({ kind: "year", year: 2027 });
    expect(january?.month).toEqual({ year: 2027, month: 1 });
    expect(labels(january?.payments.spending ?? [])).toEqual([
      "Financiera Andes S",
    ]);
    expect(december?.month).toEqual({ year: 2026, month: 12 });
    expect(december?.payments).toEqual({ spending: [], moved: [] });
  });

  it("leaves out of a year what came before the year that ends with its last month", async () => {
    // A gym paid from February to April 2026, a year before March 2027.
    const gym: readonly ExportRow[] = [
      [10, "COMPRA EN  GIMNASIO FIT", -110_000],
    ];
    const { clerkUserId } = await userWith(
      monthExport({ year: 2026, month: 2 }, gym),
      monthExport({ year: 2026, month: 3 }, gym),
      monthExport({ year: 2026, month: 4 }, gym),
      monthExport({ year: 2027, month: 3 }, [
        [2, "PAGO PSE Financiera Andes S", -1_540_000],
      ]),
    );

    const year = await getRecurringPayments(clerkUserId, {
      period: { kind: "year", year: 2027 },
    });
    const quarter = await getRecurringPayments(clerkUserId, {
      period: { kind: "quarter", year: 2027, quarter: 1 },
    });

    expect(year?.month).toEqual({ year: 2027, month: 3 });
    expect(year?.stopped).toEqual([]);
    expect(year?.stopped).toEqual(quarter?.stopped);
  });

  it("finds none in a quarter whose payments don't repeat, and keeps its last month", async () => {
    const { clerkUserId } = await userWith(fixture("quarterly-basic"));

    const recurring = await getRecurringPayments(clerkUserId, {});

    expect(recurring?.month).toEqual({ year: 2026, month: 9 });
    expect(recurring?.payments).toEqual({ spending: [], moved: [] });
  });

  it("opens the user's own account when the URL names another user's", async () => {
    const owner = await userWith(fixture("quarterly-year-rollover"));
    const stranger = await userWith(fixture("quarterly-basic"));

    const recurring = await getRecurringPayments(stranger.clerkUserId, {
      accountId: owner.accountId,
    });

    expect(recurring?.account.id).toBe(stranger.accountId);
    expect(recurring?.payments.spending).toEqual([]);
  });

  it("reads nothing for a user without movements", async () => {
    expect(await getRecurringPayments(`test_${randomUUID()}`, {})).toBeNull();
  });
});
