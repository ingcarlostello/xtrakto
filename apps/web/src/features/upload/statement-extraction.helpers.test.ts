import { readFileSync } from "node:fs";
import {
  APP_ERROR_CODE,
  err,
  extractedContentSchema,
  formatMappingSchema,
  ok,
} from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractStatement,
  proposeReading,
  readWithMapping,
} from "./statement-extraction.helpers";
import { EXTRACTION_STAGE } from "./upload.constants";
import type { ExtractionStage } from "./upload.types";

const mocks = vi.hoisted(() => ({
  extractSpreadsheet: vi.fn(),
  extractPdf: vi.fn(),
}));

// Extraction is SheetJS or pdf.js reading the bytes, tested in
// @xtrakto/parsers: here it hands over content directly, and the rest of the
// package runs for real.
vi.mock("@xtrakto/parsers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xtrakto/parsers")>()),
  extractSpreadsheet: mocks.extractSpreadsheet,
  extractPdf: mocks.extractPdf,
}));

// An XLSX file starts as a zip does; a PDF, with "%PDF-".
const BYTES = new Uint8Array([80, 75, 3, 4]);
const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\n");
const PASSWORD = "clave-inventada";

const fixture = (name: string): ExtractedContent =>
  extractedContentSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(
          `../../../../../packages/parsers/fixtures/${name}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

// The invented statements in PDF, as pdf.js reads them.
const MOVEMENTS_PDF = fixture("movements-basic-pdf");
const QUARTERLY_PDF = fixture("quarterly-basic-pdf");
const LINE_HEIGHT = 7.7;

// A row that isn't a movement where the table's end stood, and the end a line
// below it: the parser skips that row with a warning.
const withStrayRow = (content: ExtractedContent): ExtractedContent => {
  if (content.type !== "pdf") return content;
  const last = content.pages.at(-1)?.items ?? [];
  const endY = last.find(({ str }) => str === "FIN")?.y;
  const items = [
    ...last.map((item) =>
      item.y === endY ? { ...item, y: item.y + LINE_HEIGHT } : item,
    ),
    { str: "SUBTOTAL", x: 40, y: endY ?? 0, width: 28.8, height: 6 },
    { str: "1,000.00", x: 474.2, y: endY ?? 0, width: 28.8, height: 6 },
  ];
  return { type: "pdf", pages: [...content.pages.slice(0, -1), { items }] };
};
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
const extract = (bytes = BYTES, password?: string) =>
  extractStatement(bytes, {
    password,
    onStage: (stage) => {
      stages.push(stage);
    },
  });

beforeEach(() => {
  stages = [];
  mocks.extractSpreadsheet.mockReset();
  mocks.extractPdf.mockReset();
});

describe("extractStatement", () => {
  it("returns only the minimized content and a preview, through every stage", async () => {
    mocks.extractSpreadsheet.mockReturnValue(
      ok(
        movementsExport([
          [OCTOBER_2, "INTERES INV VIRT 10000000001", null, 1250.5, "nota"],
          [OCTOBER_1, "TRANSFERENCIAS A NEQUI", "3001234567", -20000],
        ]),
      ),
    );

    expect(await extract()).toEqual(
      ok({
        kind: "statement",
        statement: {
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

  it("stops at an extraction error, before recognizing anything", async () => {
    const notASpreadsheet = err({
      code: APP_ERROR_CODE.UNKNOWN_FORMAT,
      details: { reason: "file_type" },
    });
    mocks.extractSpreadsheet.mockReturnValue(notASpreadsheet);

    expect(await extract()).toEqual(notASpreadsheet);
    expect(stages).toEqual([EXTRACTION_STAGE.READING]);
  });

  it("reports content that no parser recognizes", async () => {
    mocks.extractSpreadsheet.mockReturnValue(
      ok({
        type: "spreadsheet",
        sheets: [{ name: "Mercado", rows: [["Pan", 2]] }],
      }),
    );

    expect(await extract()).toEqual(
      err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }),
    );
    expect(stages).toEqual([
      EXTRACTION_STAGE.READING,
      EXTRACTION_STAGE.RECOGNIZING,
    ]);
  });

  it("rejects content too large to send", async () => {
    // About 4 MB of minimized JSON, over the 3.5 MB a file may send.
    const description = "COMPRA EN TIENDA ".repeat(26);
    const rows = Array.from({ length: 8_000 }, () => [
      OCTOBER_1,
      description,
      null,
      -1000,
    ]);
    mocks.extractSpreadsheet.mockReturnValue(ok(movementsExport(rows)));

    expect(await extract()).toEqual(
      err({
        code: APP_ERROR_CODE.INVALID_INPUT,
        details: { reason: "too_large" },
      }),
    );
  });

  it("passes on the parse error of a file it recognized", async () => {
    mocks.extractSpreadsheet.mockReturnValue(
      ok(movementsExport([[OCTOBER_1, "TRANSFERENCIAS A NEQUI", null, "abc"]])),
    );

    const result = await extract();

    expect(!result.ok && result.error.code).toBe(APP_ERROR_CODE.PARSE_FAILED);
    expect(stages).toHaveLength(3);
  });

  it("reads a PDF by its first bytes, with its password, into the same minimized content", async () => {
    mocks.extractPdf.mockResolvedValue(ok(MOVEMENTS_PDF));

    const result = await extract(PDF_BYTES, PASSWORD);

    expect(mocks.extractPdf).toHaveBeenCalledWith(PDF_BYTES, {
      password: PASSWORD,
    });
    expect(mocks.extractSpreadsheet).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      value: {
        statement: {
          preview: {
            formatId: "bancolombia-movements-export-pdf",
            accountLast4: "8901",
            movementCount: 17,
            // Its pages, and the descriptions it wrapped over two lines.
            pdf: { pageCount: 2, joinedDescriptions: 5 },
          },
        },
      },
    });
    // Neither the page's IP address nor the time it was downloaded goes up.
    expect(JSON.stringify(result)).not.toMatch(
      /Dirección IP|203\.0\.113|a\. m\./,
    );
    expect(stages).toEqual(Object.values(EXTRACTION_STAGE));
  });

  it("counts a PDF's joined descriptions only, not the rows its parser skipped", async () => {
    mocks.extractPdf.mockResolvedValue(ok(withStrayRow(QUARTERLY_PDF)));

    expect(await extract(PDF_BYTES)).toMatchObject({
      ok: true,
      value: {
        statement: {
          preview: {
            formatId: "bancolombia-savings-quarterly-pdf",
            movementCount: 33,
            pdf: { pageCount: 2, joinedDescriptions: 0 },
          },
        },
      },
    });
  });

  it("passes on a PDF's request for its password, before recognizing anything", async () => {
    const locked = err({
      code: APP_ERROR_CODE.INVALID_INPUT,
      details: { reason: "password_required" },
    });
    mocks.extractPdf.mockResolvedValue(locked);

    expect(await extract(PDF_BYTES)).toEqual(locked);
    expect(mocks.extractPdf).toHaveBeenCalledWith(PDF_BYTES, {
      password: undefined,
    });
    expect(stages).toEqual([EXTRACTION_STAGE.READING]);
  });
});

// v8-14's "Banco Horizonte", with its invented holder in its title rows.
const HORIZONTE = fixture("mapped-out-in");
const HORIZONTE_MAPPING = formatMappingSchema.parse({
  header: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  columns: ["date", "description", "none", "money_out", "money_in", "balance"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "davivienda",
});

describe("extractStatement, for a file no parser knows", () => {
  it("keeps a spreadsheet with a table whole, with its header's names and its sample", async () => {
    mocks.extractSpreadsheet.mockReturnValue(ok(HORIZONTE));

    const result = await extract();

    expect(result).toMatchObject({
      ok: true,
      value: {
        kind: "unknown",
        content: HORIZONTE,
        format: {
          header: HORIZONTE_MAPPING.header,
          sample: { header: HORIZONTE_MAPPING.header },
        },
      },
    });
    const sample =
      result.ok && result.value.kind === "unknown"
        ? result.value.format.sample
        : undefined;
    expect(sample?.rows).toHaveLength(10);
    expect(JSON.stringify(sample)).not.toContain("SUPERMERCADO");
    expect(stages).toEqual([
      EXTRACTION_STAGE.READING,
      EXTRACTION_STAGE.RECOGNIZING,
    ]);
  });
});

describe("readWithMapping", () => {
  it("reads the file with the mapping, keeping only what it reads", () => {
    const result = readWithMapping(HORIZONTE, HORIZONTE_MAPPING);

    expect(result).toMatchObject({
      ok: true,
      value: {
        preview: {
          bankId: "davivienda",
          formatId: "mapped-spreadsheet",
          accountType: "savings",
          period: { from: "2026-09-01", to: "2026-09-30" },
          movementCount: 10,
        },
      },
    });
    // The title rows, with the holder's name and the account, stay here.
    expect(JSON.stringify(result)).not.toMatch(
      /ANA MARIA PRUEBA GOMEZ|12345678901|BANCO HORIZONTE/,
    );
  });

  it("fails when the mapping isn't the file's", () => {
    const other = {
      ...HORIZONTE_MAPPING,
      header: ["FECHA", "DETALLE", "VALOR"],
    };

    expect(readWithMapping(HORIZONTE, other)).toMatchObject({
      ok: false,
      error: { code: APP_ERROR_CODE.PARSE_FAILED },
    });
  });
});

describe("proposeReading", () => {
  it("makes the mapping the roles read, with how the file reads with it", () => {
    expect(proposeReading(HORIZONTE, HORIZONTE_MAPPING.columns)).toMatchObject({
      ok: true,
      value: {
        mapping: { ...HORIZONTE_MAPPING, bankId: "other" },
        review: {
          firstRow: 8,
          test: { movementCount: 10, balances: { isVerified: true } },
        },
      },
    });
  });

  it("fails for roles that read no table", () => {
    const roles = HORIZONTE_MAPPING.columns.slice(1);

    expect(proposeReading(HORIZONTE, roles)).toMatchObject({
      ok: false,
      error: {
        code: APP_ERROR_CODE.PARSE_FAILED,
        details: { reason: "invalid_mapping" },
      },
    });
  });
});
