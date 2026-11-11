import { describe, expect, it } from "vitest";
import {
  APP_ERROR_CODE,
  COLUMN_ROLE,
  err,
  formatMappingSchema,
  ok,
  PARSE_WARNING_CODE,
} from "@xtrakto/core";
import type {
  ExtractedContent,
  FormatMapping,
  ParsedStatement,
  SpreadsheetCell,
} from "@xtrakto/core";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import mappedDirection from "../../fixtures/mapped-direction.json";
import mappedNewestFirst from "../../fixtures/mapped-newest-first.json";
import mappedNoBalance from "../../fixtures/mapped-no-balance.json";
import mappedOutIn from "../../fixtures/mapped-out-in.json";
import mappedTitleRows from "../../fixtures/mapped-title-rows.json";
import movementsBasic from "../../fixtures/movements-basic.json";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { findParser } from "../registry/default-registry.helpers";
import { mappingParser } from "./mapping-parser.helpers";

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  REFERENCE,
  DIRECTION,
  NONE,
} = COLUMN_ROLE;

// How a person would read each invented bank's columns.
const MAPPINGS = {
  "mapped-out-in": {
    header: [
      "FECHA TRANS",
      "DETALLE",
      "OFICINA",
      "DEBITOS",
      "CREDITOS",
      "SALDO",
    ],
    columns: [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN, BALANCE],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
  "mapped-newest-first": {
    header: [
      "FECHA TRANSACCION",
      "CONCEPTO",
      "REFERENCIA",
      "MONTO",
      "SALDO DISPONIBLE",
    ],
    columns: [DATE, DESCRIPTION, REFERENCE, AMOUNT, BALANCE],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
  "mapped-direction": {
    header: ["FECHA", "DESCRIPCION", "TIPO", "VALOR", "SALDO"],
    columns: [DATE, DESCRIPTION, DIRECTION, AMOUNT, BALANCE],
    dateOrder: "ymd",
    decimalSeparator: ".",
    directionWords: { in: ["C"], out: ["D"] },
    bankId: "other",
  },
  "mapped-no-balance": {
    header: ["FECHA", "DETALLE", "DEBITOS", "CREDITOS"],
    columns: [DATE, DESCRIPTION, MONEY_OUT, MONEY_IN],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
  "mapped-title-rows": {
    header: [
      "FECHA",
      "FECHA VALOR",
      "DESCRIPCION",
      "DOCUMENTO",
      "VALOR",
      "SALDO",
    ],
    columns: [DATE, NONE, DESCRIPTION, NONE, AMOUNT, BALANCE],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
} as const;

const FIXTURES = {
  "mapped-out-in": mappedOutIn,
  "mapped-newest-first": mappedNewestFirst,
  "mapped-direction": mappedDirection,
  "mapped-no-balance": mappedNoBalance,
  "mapped-title-rows": mappedTitleRows,
};

type FixtureName = keyof typeof FIXTURES;

const NAMES = Object.keys(FIXTURES) as FixtureName[];
const WITH_BALANCES = NAMES.filter((name) => name !== "mapped-no-balance");
// Their CSV files hold text only.
const CSV_FIXTURES: FixtureName[] = [
  "mapped-out-in",
  "mapped-direction",
  "mapped-title-rows",
];

const mappingOf = (name: FixtureName, changes = {}): FormatMapping =>
  formatMappingSchema.parse({ ...MAPPINGS[name], ...changes });

const parserOf = (name: FixtureName) => mappingParser(mappingOf(name));

const contentOf = (name: FixtureName) => fixtureContent(FIXTURES[name]);

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

// A fixture's rows, mutable, to build variations of it.
const rowsOf = (name: FixtureName): SpreadsheetCell[][] =>
  fixtureRows(FIXTURES[name]).map((row) => [...row]);

const withRow = (
  name: FixtureName,
  index: number,
  change: (row: SpreadsheetCell[]) => SpreadsheetCell[],
): ExtractedContent =>
  spreadsheet(
    rowsOf(name).map((row, current) => (current === index ? change(row) : row)),
  );

const statementOf = (name: FixtureName): ParsedStatement => {
  const result = parserOf(name).parse(contentOf(name));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const failed = (details: object) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

// The invented September every layout holds, oldest first.
const SEPTEMBER = [
  ["2026-09-02", "COMPRA POS SUPERMERCADO EL ARCO", -8_540_000],
  ["2026-09-03", "ABONO NOMINA EMPRESA ABC", 420_000_000],
  ["2026-09-05", "PAGO TARJETA CREDITO", -115_000_000],
  ["2026-09-08", "RETIRO CAJERO CENTRO", -30_000_000],
  ["2026-09-08", "GMF 4X1000", -120_000],
  ["2026-09-12", "TRANSFERENCIA A NEQUI", -5_000_000],
  ["2026-09-15", "PAGO PSE EMPRESA DE ENERGIA", -18_250_000],
  ["2026-09-21", "COMPRA EN LINEA PEDIDO ****5678", -6_490_000],
  ["2026-09-25", "INTERESES AHORRO", 1_215],
  ["2026-09-30", "ABONO TRANSFERENCIA PRUEBA", 25_000_000],
];

const OPENING = 321_040_000;
const CLOSING = 582_641_215;

// Semicolons, as Excel saves a CSV in Spanish; quotes only where needed.
const csvOf = (rows: readonly (readonly SpreadsheetCell[])[]): string =>
  rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null ? "" : String(cell);
          return /[;"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(";"),
    )
    .join("\r\n");

const textFile = (text: string): Uint8Array =>
  // TextEncoder's type comes from libraries this package leaves out.
  new (
    globalThis as unknown as {
      readonly TextEncoder: new () => { encode(text: string): Uint8Array };
    }
  ).TextEncoder().encode(text);

describe("mappingParser.parse", () => {
  it.each(NAMES)(
    "reads September's movements, oldest first, from %s",
    (name) => {
      const { transactions } = statementOf(name);

      expect(
        transactions.map(({ date, descriptionNormalized, amountMinor }) => [
          date,
          descriptionNormalized,
          amountMinor,
        ]),
      ).toEqual(SEPTEMBER);
    },
  );

  it.each(WITH_BALANCES)(
    "reads %s's balances, which reconcile, its period opening the day before its first movement",
    (name) => {
      const statement = statementOf(name);

      expect(statement).toMatchObject({
        openingBalanceMinor: OPENING,
        closingBalanceMinor: CLOSING,
        period: { from: "2026-09-01", to: "2026-09-30" },
      });
      expect(reconcile(statement).balanceVerified).toBe(true);
    },
  );

  it("reads a statement of the mapping's bank without an account, from its rows", () => {
    const { transactions, ...statement } = statementOf("mapped-out-in");

    expect(statement).toEqual({
      bankId: "other",
      formatId: "mapped-spreadsheet",
      accountType: "savings",
      currency: "COP",
      period: { from: "2026-09-01", to: "2026-09-30" },
      periodSource: "rows",
      openingBalanceMinor: OPENING,
      closingBalanceMinor: CLOSING,
      warnings: [],
    });
    expect(transactions[0]).toEqual({
      date: "2026-09-02",
      descriptionRaw: "COMPRA POS SUPERMERCADO EL ARCO",
      descriptionNormalized: "COMPRA POS SUPERMERCADO EL ARCO",
      amountMinor: -8_540_000,
      balanceAfterMinor: 312_500_000,
      sourceRow: 8,
    });
  });

  it("gives its statements the mapping's bank", () => {
    const parser = mappingParser(
      mappingOf("mapped-out-in", { bankId: "bancolombia" }),
    );

    expect(parser.bankId).toBe("bancolombia");
    expect(parser.parse(contentOf("mapped-out-in"))).toMatchObject(
      ok({ bankId: "bancolombia" }),
    );
  });

  it("reads a file without balances, its period spanning its movements", () => {
    const statement = statementOf("mapped-no-balance");

    expect(statement.period).toEqual({ from: "2026-09-02", to: "2026-09-30" });
    expect(statement).not.toHaveProperty("openingBalanceMinor");
    expect(statement.transactions[0]).not.toHaveProperty("balanceAfterMinor");
    expect(reconcile(statement)).toEqual({
      balanceVerified: false,
      issues: [{ code: "NO_BALANCE_DATA" }],
    });
  });

  it("keeps references raw, until they're hashed, with their kind", () => {
    const { transactions } = statementOf("mapped-newest-first");

    expect(
      transactions.map(({ referenceRaw, referenceKind }) => [
        referenceRaw,
        referenceKind,
      ]),
    ).toEqual([
      ...Array.from({ length: 5 }, () => [undefined, "none"]),
      ["3001234567", "phone"],
      ["612345678", "code"],
      ...Array.from({ length: 3 }, () => [undefined, "none"]),
    ]);
  });

  it("masks long numbers in descriptions", () => {
    const { transactions } = statementOf("mapped-out-in");

    expect(transactions[7]?.descriptionRaw).toBe(
      "COMPRA EN LINEA PEDIDO ****5678",
    );
  });

  it("warns about a row without a date inside the table, and skips a repeated header", () => {
    expect(statementOf("mapped-title-rows").warnings).toEqual([
      { code: PARSE_WARNING_CODE.UNEXPECTED_ROW, sourceRow: 9 },
    ]);
  });

  it("warns about a balance between movements", () => {
    const rows = rowsOf("mapped-out-in");
    rows.splice(10, 0, [
      "03/09/2026",
      "SALDO DEL DIA",
      null,
      null,
      null,
      "7.325.000,00",
    ]);

    const result = parserOf("mapped-out-in").parse(spreadsheet(rows));

    expect(result).toMatchObject(
      ok({ warnings: [{ code: "UNEXPECTED_ROW", sourceRow: 10 }] }),
    );
  });

  it("closes on a balance row after the last movement, through its day", () => {
    const rows = rowsOf("mapped-out-in");
    rows.splice(18, 0, [
      "01/10/2026",
      "SALDO FINAL",
      null,
      null,
      null,
      "5.826.412,15",
    ]);

    const result = parserOf("mapped-out-in").parse(spreadsheet(rows));

    expect(result).toMatchObject(
      ok({
        closingBalanceMinor: CLOSING,
        period: { from: "2026-09-01", to: "2026-10-01" },
        warnings: [],
      }),
    );
  });

  it("reads a newest-first file's balance rows bottom-up: its closing first, its opening last", () => {
    const rows = rowsOf("mapped-newest-first");
    // 30 September and 31 August 2026, as date cells.
    rows.splice(3, 0, [
      { excelSerial: 46_295 },
      "SALDO FINAL",
      null,
      null,
      5_826_412.15,
    ]);
    rows.push([
      { excelSerial: 46_265 },
      "SALDO ANTERIOR",
      null,
      null,
      3_210_400,
    ]);

    const result = parserOf("mapped-newest-first").parse(spreadsheet(rows));
    if (!result.ok) throw new Error("Not parsed.");

    expect(result.value).toMatchObject({
      openingBalanceMinor: OPENING,
      closingBalanceMinor: CLOSING,
      period: { from: "2026-08-31", to: "2026-09-30" },
      warnings: [],
    });
    expect(reconcile(result.value).balanceVerified).toBe(true);
  });

  it("turns a day whose balances chain only the other way around", () => {
    // Newest first, but the 8th's two movements oldest first.
    const rows = rowsOf("mapped-newest-first");
    const [later, earlier] = [rows[8] ?? [], rows[9] ?? []];
    rows[8] = earlier;
    rows[9] = later;

    const result = parserOf("mapped-newest-first").parse(spreadsheet(rows));
    if (!result.ok) throw new Error("Not parsed.");

    expect(
      result.value.transactions
        .filter(({ date }) => date === "2026-09-08")
        .map(({ descriptionNormalized }) => descriptionNormalized),
    ).toEqual(["RETIRO CAJERO CENTRO", "GMF 4X1000"]);
    expect(reconcile(result.value).balanceVerified).toBe(true);
  });

  it("reads the same file whatever names its header's digits", () => {
    const rows = rowsOf("mapped-direction");
    rows[0] = ["FECHA", "DESCRIPCION", "TIPO", "VALOR", "SALDO AL 30/09/2026"];
    const mapping = mappingOf("mapped-direction", {
      header: ["FECHA", "DESCRIPCION", "TIPO", "VALOR", "SALDO AL 99/99/9999"],
    });

    expect(mappingParser(mapping).parse(spreadsheet(rows))).toMatchObject(
      ok({ closingBalanceMinor: CLOSING }),
    );
  });

  it.each([
    {
      reason: "an amount it can't read",
      content: withRow("mapped-out-in", 8, (row) => row.with(3, "85.400,0O")),
      details: {
        reason: "invalid_value",
        column: "DEBITOS",
        row: 8,
        cause: "format",
      },
    },
    {
      reason: "a date written in another order",
      content: withRow("mapped-out-in", 8, (row) => row.with(0, "2026-09-02")),
      details: {
        reason: "invalid_value",
        column: "FECHA TRANS",
        row: 8,
        cause: "date_format",
      },
    },
    {
      reason: "money out and money in on one row",
      content: withRow("mapped-out-in", 8, (row) => row.with(4, "1,00")),
      details: {
        reason: "invalid_value",
        column: "CREDITOS",
        row: 8,
        cause: "both_amounts",
      },
    },
    {
      reason: "a movement without a description",
      content: withRow("mapped-out-in", 8, (row) => row.with(1, null)),
      details: { reason: "missing_value", column: "DETALLE", row: 8 },
    },
  ])("fails on $reason, naming its row and column", ({ content, details }) => {
    expect(parserOf("mapped-out-in").parse(content)).toEqual(failed(details));
  });

  it("fails on a direction it doesn't know", () => {
    const content = withRow("mapped-direction", 1, (row) => row.with(2, "X"));

    expect(parserOf("mapped-direction").parse(content)).toEqual(
      failed({
        reason: "invalid_value",
        column: "TIPO",
        row: 1,
        cause: "direction",
      }),
    );
  });

  it("fails on dates in another order than the mapping's, at the first one", () => {
    const parser = mappingParser(
      mappingOf("mapped-out-in", { dateOrder: "ymd" }),
    );

    expect(parser.parse(contentOf("mapped-out-in"))).toEqual(
      failed({
        reason: "invalid_value",
        column: "FECHA TRANS",
        row: 7,
        cause: "date_format",
      }),
    );
  });

  it("fails on a table without movements", () => {
    const content = spreadsheet(rowsOf("mapped-out-in").slice(0, 8));

    expect(parserOf("mapped-out-in").parse(content)).toEqual(
      failed({ reason: "no_movements" }),
    );
  });

  it("fails on content without its header", () => {
    expect(
      parserOf("mapped-out-in").parse(contentOf("mapped-direction")),
    ).toEqual(failed({ reason: "missing_block", block: "header" }));
  });

  it("fails on a PDF", () => {
    const pdf: ExtractedContent = { type: "pdf", pages: [{ items: [] }] };

    expect(parserOf("mapped-out-in").parse(pdf)).toEqual(
      failed({ reason: "content_type" }),
    );
  });

  it.each(CSV_FIXTURES)("reads %s from its CSV file", (name) => {
    const file = extractSpreadsheet(textFile(csvOf(rowsOf(name))));
    if (!file.ok) throw new Error("Not extracted.");

    expect(parserOf(name).parse(file.value)).toEqual(
      parserOf(name).parse(contentOf(name)),
    );
  });
});

describe("mappingParser.canParse", () => {
  it.each(NAMES)("recognizes %s by its header, and no other layout", (name) => {
    const parser = parserOf(name);

    for (const other of NAMES) {
      expect(parser.canParse(contentOf(other))).toBe(other === name);
    }
    expect(parser.canParse(fixtureContent(quarterlyBasic))).toBe(false);
    expect(parser.canParse(fixtureContent(movementsBasic))).toBe(false);
  });

  it.each(NAMES)("leaves %s unknown to every built-in parser", (name) => {
    expect(findParser(contentOf(name))).toEqual(
      err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }),
    );
  });
});

describe("mappingParser.minimize", () => {
  it.each(NAMES)("keeps the parse of %s", (name) => {
    const { parse, minimize } = parserOf(name);
    const content = contentOf(name);

    expect(parse(minimize(content))).toEqual(parse(content));
  });

  it.each(NAMES)("gives %s the same result when run twice", (name) => {
    const { minimize } = parserOf(name);
    const minimized = minimize(contentOf(name));

    expect(minimize(minimized)).toEqual(minimized);
  });

  it("keeps nothing above the header or under the last movement, and no column it doesn't read", () => {
    const minimized = parserOf("mapped-out-in").minimize(
      contentOf("mapped-out-in"),
    );
    const rows = fixtureRows(minimized);

    expect(rows.slice(0, 6)).toEqual([[], [], [], [], [], []]);
    expect(rows[6]).toEqual([
      "FECHA TRANS",
      "DETALLE",
      "OFICINA",
      "DEBITOS",
      "CREDITOS",
      "SALDO",
    ]);
    expect(rows[8]).toEqual([
      "02/09/2026",
      "COMPRA POS SUPERMERCADO EL ARCO",
      null,
      "85.400,00",
      null,
      "3.125.000,00",
    ]);
    expect(rows).toHaveLength(18);
    for (const value of [
      "BANCO HORIZONTE",
      "ANA MARIA PRUEBA GOMEZ",
      "12345678901",
      "0102",
      "TOTALES",
      "12345678",
    ]) {
      expect(JSON.stringify(minimized)).not.toContain(value);
    }
  });

  it("keeps a page's repeated header and subtotal, without the document numbers", () => {
    const minimized = parserOf("mapped-title-rows").minimize(
      contentOf("mapped-title-rows"),
    );
    const rows = fixtureRows(minimized);

    expect(rows[10]).toEqual(rows[3]);
    expect(rows[9]).toEqual([
      null,
      null,
      "Subtotal página 1",
      null,
      "2.663.400,00",
    ]);
    expect(JSON.stringify(minimized)).not.toContain("0004500000");
    expect(JSON.stringify(minimized)).not.toContain("BANCO DEL RIO");
  });

  it("keeps references whole, for the server to hash", () => {
    const minimized = parserOf("mapped-newest-first").minimize(
      contentOf("mapped-newest-first"),
    );

    expect(JSON.stringify(minimized)).toContain("3001234567");
  });
});
