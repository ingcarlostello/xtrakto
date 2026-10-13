import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractStatement } from "./statement-extraction.helpers";
import { EXTRACTION_STAGE } from "./upload.constants";
import type { ExtractionStage } from "./upload.types";

const mocks = vi.hoisted(() => ({ extractSpreadsheet: vi.fn() }));

// Extraction is SheetJS reading the bytes, tested in @xtrakto/parsers: here
// it hands over content directly, and the rest of the package runs for real.
vi.mock("@xtrakto/parsers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xtrakto/parsers")>()),
  extractSpreadsheet: mocks.extractSpreadsheet,
}));

const BYTES = new Uint8Array([80, 75, 3, 4]);
const HEADER: SpreadsheetCell[] = [
  "Fecha",
  "Descripción",
  "Referencia",
  "Valor",
];
// Local midnight in Bogotá, stored as 05:00 UTC, as the bank's export does.
const OCTOBER_1 = { excelSerial: 46296.208333333336 };
const OCTOBER_2 = { excelSerial: 46297.208333333336 };

const movementsExport = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Movimientos", rows: [HEADER, ...rows] }],
});

let stages: ExtractionStage[];
const extract = () =>
  extractStatement(BYTES, (stage) => {
    stages.push(stage);
  });

beforeEach(() => {
  stages = [];
  mocks.extractSpreadsheet.mockReset();
});

describe("extractStatement", () => {
  it("returns only the minimized content and a preview, through every stage", () => {
    mocks.extractSpreadsheet.mockReturnValue(
      ok(
        movementsExport([
          [OCTOBER_2, "INTERES INV VIRT 10000000001", null, 1250.5, "nota"],
          [OCTOBER_1, "TRANSFERENCIAS A NEQUI", "3001234567", -20000],
        ]),
      ),
    );

    expect(extract()).toEqual(
      ok({
        content: {
          type: "spreadsheet",
          sheets: [
            {
              name: "",
              rows: [
                HEADER,
                [OCTOBER_2, "INTERES INV VIRT *******0001", null, 1250.5],
                [OCTOBER_1, "TRANSFERENCIAS A NEQUI", "3001234567", -20000],
              ],
            },
          ],
        },
        preview: {
          bankId: "bancolombia",
          formatId: "bancolombia-movements-export",
          accountType: "savings",
          period: { from: "2026-10-01", to: "2026-10-02" },
          periodSource: "rows",
          movementCount: 2,
        },
      }),
    );
    expect(mocks.extractSpreadsheet).toHaveBeenCalledWith(BYTES);
    expect(stages).toEqual([
      EXTRACTION_STAGE.READING,
      EXTRACTION_STAGE.RECOGNIZING,
      EXTRACTION_STAGE.PREPARING,
    ]);
  });

  it("stops at an extraction error, before recognizing anything", () => {
    const notASpreadsheet = err({
      code: APP_ERROR_CODE.UNKNOWN_FORMAT,
      details: { reason: "file_type" },
    });
    mocks.extractSpreadsheet.mockReturnValue(notASpreadsheet);

    expect(extract()).toEqual(notASpreadsheet);
    expect(stages).toEqual([EXTRACTION_STAGE.READING]);
  });

  it("reports content that no parser recognizes", () => {
    mocks.extractSpreadsheet.mockReturnValue(
      ok({
        type: "spreadsheet",
        sheets: [{ name: "Mercado", rows: [["Pan", 2]] }],
      }),
    );

    expect(extract()).toEqual(err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }));
    expect(stages).toEqual([
      EXTRACTION_STAGE.READING,
      EXTRACTION_STAGE.RECOGNIZING,
    ]);
  });

  it("rejects content too large to send", () => {
    // About 4 MB of minimized JSON, over the 3.5 MB a file may send.
    const description = "COMPRA EN TIENDA ".repeat(26);
    const rows = Array.from({ length: 8_000 }, () => [
      OCTOBER_1,
      description,
      null,
      -1000,
    ]);
    mocks.extractSpreadsheet.mockReturnValue(ok(movementsExport(rows)));

    expect(extract()).toEqual(
      err({
        code: APP_ERROR_CODE.INVALID_INPUT,
        details: { reason: "too_large" },
      }),
    );
  });

  it("passes on the parse error of a file it recognized", () => {
    mocks.extractSpreadsheet.mockReturnValue(
      ok(movementsExport([[OCTOBER_1, "TRANSFERENCIAS A NEQUI", null, "abc"]])),
    );

    const result = extract();

    expect(!result.ok && result.error.code).toBe(APP_ERROR_CODE.PARSE_FAILED);
    expect(stages).toHaveLength(3);
  });
});
