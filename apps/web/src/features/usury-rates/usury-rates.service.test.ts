import { randomInt, randomUUID } from "node:crypto";
import { localDateSchema } from "@xtrakto/core";
import {
  createDb,
  type DbClient,
  findOrCreateUser,
  listUsuryRates,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { refreshUsuryRates } from "./usury-rates.service";

// Against the test database, as the application role.
const database = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/lib/db", () => ({ getDb: () => database.current }));
const sentry = vi.hoisted(() => ({ captureMessage: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

// An Excel serial of a day, as the history stores its dates.
const serial = (date: string): number => {
  const [year = 0, month = 0, day = 0] = date.split("-").map(Number);
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
};

const csvOf = (rows: readonly (readonly (string | number | null)[])[]) =>
  rows
    .map((row) =>
      row
        .map((cell) =>
          typeof cell === "string"
            ? `"${cell.replaceAll('"', '""')}"`
            : (cell ?? ""),
        )
        .join(","),
    )
    .join("\n");

// An invented history in the Superintendencia Financiera's layout. The
// table is shared and the web's tests never rebuild the database, so each
// run takes a year of its own, far from any real one.
const YEAR = 2100 + randomInt(7_900);
const HISTORY = csvOf([
  [null, null, "INTERÉS ANUAL EFECTIVO"],
  [null, null, "CRÉDITO DE CONSUMO Y ORDINARIO"],
  [
    "DESDE",
    "HASTA",
    "INTERÉS BANCARIO CORRIENTE",
    // On one line here; the Excel writes this header over two.
    "TASA DE USURA 1.5 veces el Interés Bancario Corriente",
  ],
  [serial(`${YEAR}-10-01`), serial(`${YEAR}-10-31`), 0.1906, 0.2859],
  [serial(`${YEAR}-11-01`), serial(`${YEAR}-11-30`), 0.1889, 0.2834],
]);
const NOVEMBER = localDateSchema.parse(`${YEAR}-11-05`);

const answering = (body: string, status = 200) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );

describe.skipIf(!testDatabase)("refreshing the usury rates", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sentry.captureMessage.mockClear();
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const readTheYear = async () => {
    const userId = await findOrCreateUser(app.db, `test_${randomUUID()}`);
    const rates = await withUserContext(app.db, userId, listUsuryRates);
    return rates.filter(({ month }) => month.startsWith(`${YEAR}-`));
  };

  it("adds every month of the history the table doesn't have, and none it already has", async () => {
    answering(HISTORY);

    expect(await refreshUsuryRates(NOVEMBER)).toEqual({
      read: 2,
      added: 2,
      hasThisMonth: true,
    });
    expect(await refreshUsuryRates(NOVEMBER)).toEqual({
      read: 2,
      added: 0,
      hasThisMonth: true,
    });
    expect(await readTheYear()).toEqual([
      {
        month: `${YEAR}-10-01`,
        rateEaPpm: 285_900,
        source:
          "Superintendencia Financiera de Colombia, Histórico Tasa de Usura",
      },
      {
        month: `${YEAR}-11-01`,
        rateEaPpm: 283_400,
        source:
          "Superintendencia Financiera de Colombia, Histórico Tasa de Usura",
      },
    ]);
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("tells Sentry when the month that started isn't in the history yet", async () => {
    answering(HISTORY);

    const refreshed = await refreshUsuryRates(
      localDateSchema.parse(`${YEAR}-12-02`),
    );

    expect(refreshed.hasThisMonth).toBe(false);
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      `The usury rate of ${YEAR}-12 isn't in the Superintendencia Financiera's history`,
      "warning",
    );
  });

  it("fails when the history can't be had, or doesn't read, saving nothing", async () => {
    answering("", 503);
    await expect(refreshUsuryRates(NOVEMBER)).rejects.toThrow(
      "USURY_HISTORY_HTTP_503",
    );
    answering(
      csvOf([
        ["FECHA", "VALOR"],
        [serial(`${YEAR}-10-01`), 1],
      ]),
    );
    await expect(refreshUsuryRates(NOVEMBER)).rejects.toThrow(
      "USURY_HISTORY_PARSE_FAILED",
    );
  });
});
