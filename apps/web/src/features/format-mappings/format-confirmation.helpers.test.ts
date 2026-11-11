import {
  amountMinorSchema,
  formatMappingSchema,
  localDateSchema,
} from "@xtrakto/core";
import type { MappingTest } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import {
  cellText,
  formatFacts,
  readText,
  rowsNote,
  testLines,
  testVerdict,
} from "./format-confirmation.helpers";
import type { MappingProposal } from "./format-mapping.types";

const minor = (amount: number) => amountMinorSchema.parse(amount);

const MAPPING = formatMappingSchema.parse({
  header: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  columns: ["date", "description", "none", "money_out", "money_in", "balance"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});

const WAYS = {
  movementCount: 10,
  moneyIn: { count: 3, totalMinor: minor(445_001_215) },
  moneyOut: { count: 7, totalMinor: minor(183_400_000) },
};

const BALANCES = {
  openingMinor: minor(321_040_000),
  computedClosingMinor: minor(582_641_215),
  closingMinor: minor(582_641_215),
  closingOn: localDateSchema.parse("2026-09-30"),
  isVerified: true,
};

const proposal = (
  review: Partial<MappingProposal["review"]>,
): MappingProposal => ({
  mapping: MAPPING,
  review: {
    header: MAPPING.header,
    rows: [],
    moreRows: 0,
    firstRow: 8,
    lastRow: 18,
    test: WAYS,
    ...review,
  },
});

describe("cellText", () => {
  it.each([
    ["  COMPRA EN TIENDA ", "COMPRA EN TIENDA"],
    [85_400, "85.400"],
    [12.15, "12,15"],
    [{ excelSerial: 46_267 }, "02/09/2026"],
    [null, ""],
  ])("shows %j as %j", (cell, text) => {
    expect(cellText(cell)).toBe(text);
  });
});

describe("rowsNote", () => {
  it("says how many rows are left, and which row opens the table", () => {
    const openingRow = [
      "01/09/2026",
      "SALDO ANTERIOR",
      null,
      null,
      null,
      "3.210.400,00",
    ];

    expect(rowsNote(proposal({ moreRows: 6, openingRow }))).toBe(
      "Y 6 filas más. La fila “SALDO ANTERIOR” se usa como saldo inicial, no como movimiento.",
    );
  });

  it("says one row is left, or nothing when none is and nothing opens it", () => {
    expect(rowsNote(proposal({ moreRows: 1 }))).toBe("Y 1 fila más.");
    expect(rowsNote(proposal({}))).toBe("");
  });
});

describe("formatFacts", () => {
  it("names how the file writes its numbers and dates, and where its table is", () => {
    expect(formatFacts(proposal({}))).toEqual([
      { term: "Números", value: "1.234,56" },
      { term: "Fechas", value: "día/mes/año" },
      { term: "Moneda", value: "pesos (COP)" },
      { term: "Empieza en", value: "fila 8" },
      { term: "Termina en", value: "fila 18" },
    ]);
  });

  it("names a decimal point and the year first", () => {
    const point = {
      ...proposal({}),
      mapping: { ...MAPPING, decimalSeparator: ".", dateOrder: "ymd" },
    } as const;

    expect(formatFacts(point).slice(0, 2)).toEqual([
      { term: "Números", value: "1,234.56" },
      { term: "Fechas", value: "año/mes/día" },
    ]);
  });
});

describe("testLines", () => {
  it("adds the balances around a file that prints them", () => {
    expect(testLines({ ...WAYS, balances: BALANCES })).toEqual({
      ways: [
        { label: "Saldo inicial", amount: "$3.210.400" },
        { label: "+ Entradas (3)", amount: "$4.450.012,15", tone: "income" },
        { label: "− Salidas (7)", amount: "$1.834.000", tone: "spending" },
      ],
      closing: { label: "Saldo final calculado", amount: "$5.826.412,15" },
    });
  });

  it("closes with what the movements add up to, not what the file says", () => {
    const off = {
      ...BALANCES,
      closingMinor: minor(582_640_000),
      isVerified: false,
    };

    expect(testLines({ ...WAYS, balances: off }).closing).toEqual({
      label: "Saldo final calculado",
      amount: "$5.826.412,15",
    });
  });

  it("shows only what came in and went out of a file without balances", () => {
    const { ways, closing } = testLines(WAYS);

    expect(ways.map(({ label }) => label)).toEqual([
      "+ Entradas (3)",
      "− Salidas (7)",
    ]);
    expect(closing).toBeUndefined();
  });
});

describe("testVerdict", () => {
  const withBalances = (change: object): MappingTest => ({
    ...WAYS,
    balances: { ...BALANCES, ...change },
  });

  it("says the file adds up, with the closing balance it prints", () => {
    expect(testVerdict(withBalances({}))).toEqual({
      tone: "ok",
      title: "Cuadra con tu extracto",
      detail: "El archivo dice $5.826.412,15 al 30 de septiembre.",
    });
  });

  it("says by how much the movements miss the closing balance", () => {
    const off = withBalances({
      closingMinor: minor(582_640_000),
      isVerified: false,
    });

    expect(testVerdict(off)).toMatchObject({
      tone: "attention",
      title: "No cuadra por $12,15",
    });
  });

  it("says it doesn't add up when a row breaks the chain but the closing balance does", () => {
    expect(testVerdict(withBalances({ isVerified: false }))).toMatchObject({
      tone: "attention",
      title: "No cuadra",
    });
  });

  it("says a file without balances has none to check", () => {
    expect(testVerdict(WAYS)).toEqual({
      tone: "none",
      title: "Este archivo no trae saldos",
      detail: "Revisa que las entradas y las salidas se vean bien.",
    });
  });
});

describe("readText", () => {
  it("counts the movements read", () => {
    expect(readText(WAYS)).toBe("Leímos 10 movimientos con este mapeo.");
    expect(readText({ ...WAYS, movementCount: 1 })).toBe(
      "Leímos 1 movimiento con este mapeo.",
    );
  });
});
