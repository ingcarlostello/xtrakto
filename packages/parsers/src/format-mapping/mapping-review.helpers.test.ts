import {
  APP_ERROR_CODE,
  COLUMN_ROLE,
  formatMappingSchema,
} from "@xtrakto/core";
import type {
  ExtractedContent,
  FormatMapping,
  SpreadsheetCell,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import {
  MAPPED_FIXTURE_MAPPINGS,
  MAPPED_FIXTURES,
} from "../../fixtures/mapped-fixtures";
import { reviewMapping } from "./mapping-review.helpers";

const { DATE, DESCRIPTION, AMOUNT, BALANCE } = COLUMN_ROLE;

const OUT_IN = MAPPED_FIXTURES["mapped-out-in"];
const OUT_IN_MAPPING = formatMappingSchema.parse(
  MAPPED_FIXTURE_MAPPINGS["mapped-out-in"],
);

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const reviewOf = (content: ExtractedContent, mapping: FormatMapping) => {
  const review = reviewMapping(content, mapping);
  if (!review.ok) throw new Error(JSON.stringify(review.error));
  return review.value;
};

const SIGNED: FormatMapping = formatMappingSchema.parse({
  header: ["FECHA", "DETALLE", "VALOR", "SALDO"],
  columns: [DATE, DESCRIPTION, AMOUNT, BALANCE],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});

describe("reviewMapping", () => {
  it("shows the header and the table's first rows as the file writes them", () => {
    const review = reviewOf(fixtureContent(OUT_IN), OUT_IN_MAPPING);
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
    expect(reviewOf(fixtureContent(OUT_IN), OUT_IN_MAPPING)).toMatchObject({
      firstRow: 8,
      lastRow: 18,
    });
  });

  it("adds up the movements each way, and checks them against the balances", () => {
    expect(reviewOf(fixtureContent(OUT_IN), OUT_IN_MAPPING).test).toEqual({
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

    expect(
      reviewOf(spreadsheet(rows), OUT_IN_MAPPING).test.balances,
    ).toMatchObject({
      computedClosingMinor: 582_641_215,
      closingMinor: 582_640_000,
      isVerified: false,
    });
  });

  it("has no balances for a file that prints none", () => {
    const fixture = MAPPED_FIXTURES["mapped-no-balance"];
    const mapping = formatMappingSchema.parse(
      MAPPED_FIXTURE_MAPPINGS["mapped-no-balance"],
    );
    const review = reviewOf(fixtureContent(fixture), mapping);

    expect(review.test).toEqual({
      movementCount: 10,
      moneyIn: { count: 3, totalMinor: 445_001_215 },
      moneyOut: { count: 7, totalMinor: 183_400_000 },
    });
    expect(review).toMatchObject({ firstRow: 4, lastRow: 13, moreRows: 5 });
    expect(review.openingRow).toBeUndefined();
  });

  it("marks the opening balance a newest-first file prints last, and no closing one", () => {
    const review = reviewOf(
      spreadsheet([
        ["FECHA", "DETALLE", "VALOR", "SALDO"],
        ["30/09/2026", "SALDO FINAL", null, "1.300,00"],
        ["03/09/2026", "ABONO", "500,00", "1.300,00"],
        ["02/09/2026", "COMPRA", "-200,00", "800,00"],
        ["01/09/2026", "SALDO ANTERIOR", null, "1.000,00"],
      ]),
      SIGNED,
    );

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
    expect(review.test.balances).toMatchObject({
      openingMinor: 100_000,
      closingMinor: 130_000,
      isVerified: true,
    });
  });

  it("fails as the parse does when the mapping doesn't read the file", () => {
    const mapping = {
      ...OUT_IN_MAPPING,
      header: ["OTRO", ...OUT_IN_MAPPING.header.slice(1)],
    };

    expect(reviewMapping(fixtureContent(OUT_IN), mapping)).toMatchObject({
      ok: false,
      error: {
        code: APP_ERROR_CODE.PARSE_FAILED,
        details: { reason: "missing_block", block: "header" },
      },
    });
  });
});
