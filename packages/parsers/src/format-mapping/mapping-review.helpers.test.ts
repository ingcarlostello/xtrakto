import {
  APP_ERROR_CODE,
  COLUMN_ROLE,
  DATE_ORDER,
  formatMappingSchema,
  ROLES_PROBLEM,
} from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import {
  MAPPED_FIXTURE_MAPPINGS,
  MAPPED_FIXTURES,
} from "../../fixtures/mapped-fixtures";
import { reviewChoices } from "./mapping-review.helpers";
import type { MappingChoices } from "./mapping-roles.helpers";

const { DATE, DESCRIPTION, AMOUNT, BALANCE, NONE } = COLUMN_ROLE;

const OUT_IN = MAPPED_FIXTURES["mapped-out-in"];
const OUT_IN_ROLES = {
  roles: MAPPED_FIXTURE_MAPPINGS["mapped-out-in"].columns,
};

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const reviewOf = (content: ExtractedContent, choices?: MappingChoices) => {
  const review = reviewChoices(content, choices);
  if (!review.ok) throw new Error(JSON.stringify(review.error));
  return review.value;
};

const testOf = (content: ExtractedContent, choices?: MappingChoices) => {
  const { reading } = reviewOf(content, choices);
  if (!reading.ok) throw new Error(JSON.stringify(reading.error));
  return reading.value.test;
};

const SIGNED = { roles: [DATE, DESCRIPTION, AMOUNT, BALANCE] };

describe("reviewChoices", () => {
  it("shows the header and the table's first rows as the file writes them", () => {
    const review = reviewOf(fixtureContent(OUT_IN), OUT_IN_ROLES);
    const rows = fixtureRows(OUT_IN);

    expect(review.header).toEqual(rows[6]);
    expect(review.rows).toHaveLength(5);
    expect(review.rows[0]).toEqual({
      cells: rows[7]?.concat([null, null, null]).slice(0, 6),
      kind: "balance",
      isOpening: true,
    });
    expect(review.rows[1]).toEqual({
      cells: rows[8]?.concat([null]).slice(0, 6),
      kind: "movement",
      isOpening: false,
    });
    expect(review.openingRow).toEqual(review.rows[0]?.cells);
    expect(review.moreRows).toBe(6);
  });

  it("says where the table starts and ends, as a spreadsheet numbers its rows", () => {
    expect(reviewOf(fixtureContent(OUT_IN), OUT_IN_ROLES)).toMatchObject({
      firstRow: 8,
      lastRow: 18,
    });
  });

  it("gives the mapping the choices make, with the formats its cells write", () => {
    const review = reviewOf(fixtureContent(OUT_IN), OUT_IN_ROLES);

    expect(review).toMatchObject({
      roles: OUT_IN_ROLES.roles,
      dateOrder: "dmy",
      decimalSeparator: ",",
      reading: {
        ok: true,
        value: {
          mapping: formatMappingSchema.parse({
            ...MAPPED_FIXTURE_MAPPINGS["mapped-out-in"],
            bankId: "other",
          }),
        },
      },
    });
  });

  it("adds up the movements each way, and checks them against the balances", () => {
    expect(testOf(fixtureContent(OUT_IN), OUT_IN_ROLES)).toEqual({
      movementCount: 10,
      moneyIn: { count: 3, totalMinor: 445_001_215 },
      moneyOut: { count: 7, totalMinor: 183_400_000 },
      balances: {
        openingMinor: 321_040_000,
        computedClosingMinor: 582_641_215,
        closingMinor: 582_641_215,
        closingOn: "2026-09-30",
        isVerified: true,
      },
    });
  });

  it("says by how much a closing balance the movements don't reach is off", () => {
    const rows = fixtureRows(OUT_IN).map((row) => [...row]);
    rows[17] = rows[17]?.with(5, "5.826.400,00") ?? [];

    expect(testOf(spreadsheet(rows), OUT_IN_ROLES).balances).toMatchObject({
      computedClosingMinor: 582_641_215,
      closingMinor: 582_640_000,
      isVerified: false,
    });
  });

  it("has no balances for a file that prints none", () => {
    const fixture = fixtureContent(MAPPED_FIXTURES["mapped-no-balance"]);
    const choices = {
      roles: MAPPED_FIXTURE_MAPPINGS["mapped-no-balance"].columns,
    };
    const review = reviewOf(fixture, choices);

    expect(testOf(fixture, choices)).toEqual({
      movementCount: 10,
      moneyIn: { count: 3, totalMinor: 445_001_215 },
      moneyOut: { count: 7, totalMinor: 183_400_000 },
    });
    expect(review).toMatchObject({ firstRow: 4, lastRow: 13, moreRows: 5 });
    expect(review.openingRow).toBeUndefined();
  });

  it("marks the opening balance a newest-first file prints last, and no closing one", () => {
    const content = spreadsheet([
      ["FECHA", "DETALLE", "VALOR", "SALDO"],
      ["30/09/2026", "SALDO FINAL", null, "1.300,00"],
      ["03/09/2026", "ABONO", "500,00", "1.300,00"],
      ["02/09/2026", "COMPRA", "-200,00", "800,00"],
      ["01/09/2026", "SALDO ANTERIOR", null, "1.000,00"],
    ]);
    const review = reviewOf(content, SIGNED);

    expect(review.rows.map(({ kind, isOpening }) => [kind, isOpening])).toEqual(
      [
        ["balance", false],
        ["movement", false],
        ["movement", false],
        ["balance", true],
      ],
    );
    expect(review.openingRow).toEqual([
      "01/09/2026",
      "SALDO ANTERIOR",
      null,
      "1.000,00",
    ]);
    expect(testOf(content, SIGNED).balances).toMatchObject({
      openingMinor: 100_000,
      closingMinor: 130_000,
      isVerified: true,
    });
  });

  it("marks a row the mapping skips as no movement", () => {
    const content = spreadsheet([
      ["FECHA", "DETALLE", "VALOR", "NOTA"],
      ["01/09/2026", "COMPRA", "-200,00", null],
      [null, null, null, "Subtotal de la página"],
      ["02/09/2026", "ABONO", "500,00", null],
    ]);
    const review = reviewOf(content, {
      roles: [DATE, DESCRIPTION, AMOUNT, NONE],
    });

    expect(review.rows.map(({ kind }) => kind)).toEqual([
      "movement",
      "other",
      "movement",
    ]);
  });

  it("reads with only the date the code found, without choices", () => {
    const review = reviewOf(fixtureContent(OUT_IN));

    expect(review).toMatchObject({
      roles: [DATE, NONE, NONE, NONE, NONE, NONE],
      dateOrder: "dmy",
      decimalSeparator: ",",
      firstRow: 8,
      lastRow: 18,
      reading: {
        ok: false,
        error: {
          code: APP_ERROR_CODE.PARSE_FAILED,
          details: {
            reason: "invalid_mapping",
            cause: ROLES_PROBLEM.DESCRIPTION,
          },
        },
      },
    });
    expect(review.rows).toHaveLength(5);
    expect(review.rows[0]).not.toHaveProperty("kind");
  });

  it("starts from the column the code found the date in, and ends the table at the date the person chose", () => {
    const content = spreadsheet([
      ["DETALLE", "FECHA", "VALOR", "FECHA VALOR"],
      ["COMPRA", "01/09/2026", "-200,00", "01/09/2026"],
      ["ABONO", "02/09/2026", "500,00", "02/09/2026"],
      ["RETIRO", "03/09/2026", "-100,00", null],
    ]);
    const byValueDate = { roles: [DESCRIPTION, NONE, AMOUNT, DATE] };

    expect(reviewOf(content)).toMatchObject({
      roles: [NONE, DATE, NONE, NONE],
      lastRow: 4,
    });
    expect(reviewOf(content, byValueDate)).toMatchObject({ lastRow: 3 });
  });

  it("leaves out the header a page repeats", () => {
    const content = spreadsheet([
      ["FECHA", "DETALLE", "VALOR", "SALDO"],
      ["01/09/2026", "COMPRA", "-200,00", "800,00"],
      ["Fecha", "Detalle", "Valor", "Saldo"],
      ["02/09/2026", "ABONO", "500,00", "1.300,00"],
    ]);

    expect(reviewOf(content, SIGNED).rows.map(({ cells }) => cells[1])).toEqual(
      ["COMPRA", "ABONO"],
    );
  });

  it("reads how the file writes its numbers before any column is the amount", () => {
    const direction = fixtureContent(MAPPED_FIXTURES["mapped-direction"]);

    expect(reviewOf(direction)).toMatchObject({
      roles: [DATE, NONE, NONE, NONE, NONE],
      dateOrder: "ymd",
      decimalSeparator: ".",
    });
  });

  it("says where the choices stop reading the file, with the format they chose", () => {
    const choices = { ...OUT_IN_ROLES, dateOrder: DATE_ORDER.YEAR_MONTH_DAY };
    const review = reviewOf(fixtureContent(OUT_IN), choices);

    expect(review).toMatchObject({
      dateOrder: "ymd",
      reading: {
        ok: false,
        error: {
          details: {
            reason: "invalid_value",
            column: "FECHA TRANS",
            row: 7,
            cause: "date_format",
          },
        },
      },
    });
    expect(review.openingRow).toBeUndefined();
  });

  it("finds no table in content without one", () => {
    expect(reviewChoices(spreadsheet([["Hola"]]))).toMatchObject({
      ok: false,
      error: {
        code: APP_ERROR_CODE.UNKNOWN_FORMAT,
        details: { reason: "no_table" },
      },
    });
  });
});
