import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { SpreadsheetCell } from "@xtrakto/core";
import { fixtureRows } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import type { SheetRows } from "../sheets/sheet.utils";
import {
  detectReferenceKind,
  readExportMovements,
} from "./movements-export.helpers";

// Invented values, as generated in scripts/fixture-data.mjs. Rows 1 to 17
// list 2026-10-07 down to 2026-10-01, newest first.
const BASIC = fixtureRows(movementsBasic);
const HEADER = BASIC[0] ?? [];
const COLUMN = { DATE: 0, DESCRIPTION: 1, REFERENCE: 2, AMOUNT: 3 };

const movementsOf = (rows: SheetRows) => {
  const result = readExportMovements(rows);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const BASIC_MOVEMENTS = movementsOf(BASIC);

const movementAt = (sourceRow: number) =>
  BASIC_MOVEMENTS.find((movement) => movement.sourceRow === sourceRow);

const withCell = (row: number, column: number, value: SpreadsheetCell) =>
  BASIC.with(row, (BASIC[row] ?? []).with(column, value));

const failed = (details: object) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

describe("readExportMovements", () => {
  it("reads every movement under the header", () => {
    expect(BASIC_MOVEMENTS).toHaveLength(17);
    expect(BASIC_MOVEMENTS[0]).toEqual({
      date: "2026-10-01",
      descriptionRaw: "TRANSFERENCIAS A NEQUI",
      descriptionNormalized: "TRANSFERENCIAS A NEQUI",
      amountMinor: -5_000_000,
      referenceRaw: "3001234567",
      referenceKind: "phone",
      sourceRow: 17,
    });
  });

  it("converts numeric amounts to cents without floating-point drift", () => {
    expect(movementAt(1)?.amountMinor).toBe(-8_425_050); // -84250.5
    expect(movementAt(2)?.amountMinor).toBe(320_000_000); // 3200000
    expect(movementAt(10)?.amountMinor).toBe(93); // 0.93
  });

  it("converts a 05:00 UTC date to the same day in Bogotá", () => {
    // Serial 46302.2083…: 2026-10-07 at 05:00 UTC, local midnight.
    expect(movementAt(1)?.date).toBe("2026-10-07");
  });

  it("converts a date at 00:00 UTC to the previous day in Bogotá", () => {
    const rows = withCell(1, COLUMN.DATE, { excelSerial: 46_302 });

    expect(
      movementsOf(rows).find(({ sourceRow }) => sourceRow === 1),
    ).toMatchObject({ date: "2026-10-06" });
  });

  it("puts the movements oldest first, each day's read bottom-up", () => {
    const dates = BASIC_MOVEMENTS.map(({ date }) => date);
    const lastDay = BASIC_MOVEMENTS.filter(({ date }) => date === "2026-10-07");

    expect(dates).toEqual(dates.toSorted());
    expect(lastDay.map(({ sourceRow }) => sourceRow)).toEqual([4, 3, 2, 1]);
  });

  it("places a row that is out of order by its date", () => {
    const oldest = BASIC[17] ?? [];
    const rows = [HEADER, oldest, ...BASIC.slice(1, 17)];

    expect(movementsOf(rows).map(({ date }) => date)).toEqual(
      BASIC_MOVEMENTS.map(({ date }) => date),
    );
    expect(movementsOf(rows)[0]?.sourceRow).toBe(1);
  });

  it("keeps the bank's spacing in the raw description and collapses it in the normalized one", () => {
    expect(movementAt(1)).toMatchObject({
      descriptionRaw: "COMPRA EN  MERCADO XYZ",
      descriptionNormalized: "COMPRA EN MERCADO XYZ",
    });
  });

  it("masks long numbers in descriptions", () => {
    const rows = withCell(
      1,
      COLUMN.DESCRIPTION,
      "INTERES INV VIRT 10000000001",
    );
    const movements = movementsOf(rows);

    expect(movements.find(({ sourceRow }) => sourceRow === 1)).toMatchObject({
      descriptionRaw: "INTERES INV VIRT *******0001",
      descriptionNormalized: "INTERES INV VIRT *******0001",
    });
    expect(JSON.stringify(movements)).not.toContain("10000000001");
  });

  it.each([
    { label: "a mobile number", row: 17, raw: "3001234567", kind: "phone" },
    {
      label: "an ATM's location",
      row: 12,
      raw: "ATM PLAZA CENTRAL 1",
      kind: "atm",
    },
    {
      label: "a code with leading zeros",
      row: 15,
      raw: "0077001234",
      kind: "code",
    },
    { label: "a PSE number", row: 9, raw: "445566778", kind: "code" },
    {
      label: "several contract numbers",
      row: 5,
      raw: "123456 1234567890 12345",
      kind: "code",
    },
  ])(
    "keeps $label as the raw reference, with its kind",
    ({ row, raw, kind }) => {
      expect(movementAt(row)).toMatchObject({
        referenceRaw: raw,
        referenceKind: kind,
      });
    },
  );

  it.each([
    { label: "an empty reference", reference: null },
    { label: "a reference of spaces", reference: "   " },
  ])("gives $label the kind none and no raw reference", ({ reference }) => {
    const rows = withCell(17, COLUMN.REFERENCE, reference);
    const movement = movementsOf(rows)[0];

    expect(movement?.referenceKind).toBe("none");
    expect(movement).not.toHaveProperty("referenceRaw");
  });

  it("trims spaces around a reference", () => {
    const rows = withCell(17, COLUMN.REFERENCE, " 3001234567 ");

    expect(movementsOf(rows)[0]).toMatchObject({
      referenceRaw: "3001234567",
      referenceKind: "phone",
    });
  });

  it("skips blank rows", () => {
    const rows = BASIC.toSpliced(5, 0, [], [null, "  "]);

    expect(movementsOf(rows)).toHaveLength(17);
  });

  it("reads an export without movements", () => {
    expect(readExportMovements([HEADER])).toEqual(ok([]));
  });

  it.each([
    {
      label: "the header lacks Referencia",
      rows: BASIC.with(0, HEADER.with(COLUMN.REFERENCE, "Ref.")),
      details: { reason: "missing_column", column: "Referencia" },
    },
    {
      label: "the sheet is empty",
      rows: [],
      details: { reason: "missing_column", column: "Fecha" },
    },
    {
      label: "the header isn't the first row",
      rows: [[], ...BASIC],
      details: { reason: "missing_column", column: "Fecha" },
    },
    {
      label: "a date is missing",
      rows: withCell(3, COLUMN.DATE, null),
      details: { reason: "missing_value", column: "Fecha", row: 3 },
    },
    {
      label: "a date is text, as in a CSV saved from Excel",
      rows: withCell(3, COLUMN.DATE, "7/10/2026"),
      details: {
        reason: "invalid_value",
        column: "Fecha",
        row: 3,
        cause: "type",
      },
    },
    {
      label: "a date is a number without a date format",
      rows: withCell(3, COLUMN.DATE, 46_302),
      details: {
        reason: "invalid_value",
        column: "Fecha",
        row: 3,
        cause: "type",
      },
    },
    {
      label: "a date is outside Excel's calendar",
      rows: withCell(3, COLUMN.DATE, { excelSerial: 10 }),
      details: {
        reason: "invalid_value",
        column: "Fecha",
        row: 3,
        cause: "range",
      },
    },
    {
      label: "a description is empty",
      rows: withCell(3, COLUMN.DESCRIPTION, "  "),
      details: { reason: "missing_value", column: "Descripción", row: 3 },
    },
    {
      label: "an amount is missing",
      rows: withCell(3, COLUMN.AMOUNT, null),
      details: { reason: "missing_value", column: "Valor", row: 3 },
    },
    {
      label: "an amount is text with a decimal comma",
      rows: withCell(3, COLUMN.AMOUNT, "5,12"),
      details: {
        reason: "invalid_value",
        column: "Valor",
        row: 3,
        cause: "type",
      },
    },
    {
      label: "an amount has fractions of a cent",
      rows: withCell(3, COLUMN.AMOUNT, 5.125),
      details: {
        reason: "invalid_value",
        column: "Valor",
        row: 3,
        cause: "format",
      },
    },
    {
      label: "a reference is a number, which loses leading zeros",
      rows: withCell(15, COLUMN.REFERENCE, 77_001_234),
      details: {
        reason: "invalid_value",
        column: "Referencia",
        row: 15,
        cause: "type",
      },
    },
  ])("fails when $label", ({ rows, details }) => {
    expect(readExportMovements(rows)).toEqual(failed(details));
  });
});

describe("detectReferenceKind", () => {
  it.each([
    { reference: "3001234567", kind: "phone" },
    { reference: "3109876543", kind: "phone" },
    { reference: "ATM PLAZA CENTRAL 1", kind: "atm" },
    { reference: "0077001234", kind: "code" },
    { reference: "300123456", kind: "code" },
    { reference: "30012345678", kind: "code" },
    { reference: "01234567890", kind: "code" },
    { reference: "123456 1234567890 12345", kind: "code" },
    { reference: "ATMOSFERA", kind: "code" },
  ])("reads $reference as $kind", ({ reference, kind }) => {
    expect(detectReferenceKind(reference)).toBe(kind);
  });
});
