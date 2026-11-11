import {
  amountMinorSchema,
  APP_ERROR_CODE,
  COLUMN_ROLE,
  err,
  formatMappingSchema,
  localDateSchema,
  ok,
} from "@xtrakto/core";
import type { MappingReview, MappingTest } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import {
  cellText,
  columnLabel,
  formatFacts,
  readText,
  rolesLeft,
  rowsNote,
  testLines,
  testVerdict,
} from "./format-confirmation.helpers";

const minor = (amount: number) => amountMinorSchema.parse(amount);

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

const MAPPING = formatMappingSchema.parse({
  header: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  columns: [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN, BALANCE],
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

const reviewOf = (review: Partial<MappingReview>): MappingReview => ({
  header: MAPPING.header,
  names: MAPPING.header,
  rows: [],
  moreRows: 0,
  firstRow: 8,
  lastRow: 18,
  roles: MAPPING.columns,
  dateOrder: "dmy",
  decimalSeparator: ",",
  reading: ok({ mapping: MAPPING, test: WAYS }),
  ...review,
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

    const review = reviewOf({ moreRows: 6, openingRow });

    expect(rowsNote(review, MAPPING.columns)).toBe(
      "Y 6 filas más. La fila “SALDO ANTERIOR” se usa como saldo inicial, no como movimiento.",
    );
  });

  it("quotes the opening row by the description the person chose", () => {
    const openingRow = ["01/09/2026", "SALDO ANTERIOR", "0102"];
    const roles = [DATE, NONE, DESCRIPTION];

    expect(rowsNote(reviewOf({ openingRow }), roles)).toBe(
      "La fila “0102” se usa como saldo inicial, no como movimiento.",
    );
  });

  it("says one row is left, or nothing when none is and nothing opens it", () => {
    expect(rowsNote(reviewOf({ moreRows: 1 }), MAPPING.columns)).toBe(
      "Y 1 fila más.",
    );
    expect(rowsNote(reviewOf({}), MAPPING.columns)).toBe("");
  });
});

describe("formatFacts", () => {
  it("names the file's currency and where its table starts and ends", () => {
    expect(formatFacts(reviewOf({}))).toEqual([
      { term: "Moneda", value: "pesos (COP)" },
      { term: "Empieza en", value: "fila 8" },
      { term: "Termina en", value: "fila 18" },
    ]);
  });
});

describe("rolesLeft", () => {
  const ALL = [
    DATE,
    DESCRIPTION,
    AMOUNT,
    MONEY_OUT,
    MONEY_IN,
    BALANCE,
    REFERENCE,
    DIRECTION,
    NONE,
  ];

  it("offers a column every role while no other column takes one", () => {
    expect(rolesLeft([NONE, NONE, NONE], 1)).toEqual(ALL);
  });

  it("leaves out the date, description, balance and reference another column has", () => {
    const roles = [DATE, DESCRIPTION, BALANCE, REFERENCE, NONE];

    expect(rolesLeft(roles, 4)).toEqual([
      AMOUNT,
      MONEY_OUT,
      MONEY_IN,
      DIRECTION,
      NONE,
    ]);
  });

  it("keeps money read one way", () => {
    expect(rolesLeft([AMOUNT, NONE], 1)).toEqual([
      DATE,
      DESCRIPTION,
      BALANCE,
      REFERENCE,
      DIRECTION,
      NONE,
    ]);
    expect(rolesLeft([MONEY_OUT, NONE], 1)).toEqual([
      DATE,
      DESCRIPTION,
      MONEY_IN,
      BALANCE,
      REFERENCE,
      NONE,
    ]);
    expect(rolesLeft([DIRECTION, NONE], 1)).toEqual([
      DATE,
      DESCRIPTION,
      AMOUNT,
      BALANCE,
      REFERENCE,
      NONE,
    ]);
  });

  it("keeps a column's own role among its choices", () => {
    expect(rolesLeft(MAPPING.columns, 0)).toContain(DATE);
    expect(rolesLeft(MAPPING.columns, 3)).toEqual([MONEY_OUT, REFERENCE, NONE]);
  });
});

describe("columnLabel", () => {
  it("names a column's choice by its name, or its place when it has none", () => {
    expect(columnLabel(" Fecha Trans ", 0)).toBe(
      "Qué es la columna Fecha Trans",
    );
    expect(columnLabel(null, 2)).toBe("Qué es la columna 3");
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
    const one = ok({ mapping: MAPPING, test: { ...WAYS, movementCount: 1 } });

    expect(readText(reviewOf({}), false)).toBe(
      "Leímos 10 movimientos con este mapeo.",
    );
    expect(readText(reviewOf({ reading: one }), false)).toBe(
      "Leímos 1 movimiento con este mapeo.",
    );
  });

  it("says the file is read again, or that the choices don't read it", () => {
    const unread = reviewOf({
      reading: err({ code: APP_ERROR_CODE.PARSE_FAILED }),
    });

    expect(readText(reviewOf({}), true)).toBe("Leyendo tu archivo de nuevo…");
    expect(readText(unread, false)).toBe(
      "Así no podemos leer todo el archivo.",
    );
  });
});
