import { describe, expect, it } from "vitest";
import { COLUMN_ROLE } from "./format-mapping.constants";
import { formatMappingSchema } from "./format-mapping.schemas";
import type { ColumnRole } from "./format-mapping.types";

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

// v8-14's invented "Banco Horizonte": money out and money in, a branch to
// ignore and the balance.
const HORIZONTE = {
  header: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  columns: [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN, BALANCE],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
};

const withColumns = (columns: readonly ColumnRole[], changes = {}) => ({
  ...HORIZONTE,
  header: columns.map((_role, index) => `COLUMNA ${index}`),
  columns,
  ...changes,
});

const DIRECTION_WORDS = { in: ["C", "Crédito"], out: ["D", "Débito"] };

const problemOf = (mapping: unknown): string | undefined =>
  formatMappingSchema.safeParse(mapping).error?.issues[0]?.message;

describe("formatMappingSchema", () => {
  it.each([
    {
      way: "money out and money in",
      mapping: HORIZONTE,
    },
    {
      way: "a signed amount, with a reference",
      mapping: withColumns([DATE, DESCRIPTION, REFERENCE, AMOUNT, BALANCE]),
    },
    {
      way: "a signed amount without a balance",
      mapping: withColumns([DESCRIPTION, AMOUNT, DATE]),
    },
    {
      way: "an amount and its direction",
      mapping: withColumns([DATE, DESCRIPTION, DIRECTION, AMOUNT, BALANCE], {
        directionWords: DIRECTION_WORDS,
      }),
    },
  ])("accepts $way", ({ mapping }) => {
    expect(formatMappingSchema.safeParse(mapping).error).toBeUndefined();
  });

  it.each([
    {
      problem: "a role for each column",
      mapping: { ...HORIZONTE, columns: HORIZONTE.columns.slice(1) },
    },
    {
      problem: "one date column",
      mapping: withColumns([DESCRIPTION, AMOUNT]),
    },
    {
      problem: "one date column",
      mapping: withColumns([DATE, DATE, DESCRIPTION, AMOUNT]),
    },
    {
      problem: "one description column",
      mapping: withColumns([DATE, AMOUNT, BALANCE]),
    },
    {
      problem: "one balance column at most",
      mapping: withColumns([DATE, DESCRIPTION, AMOUNT, BALANCE, BALANCE]),
    },
    {
      problem: "one reference column at most",
      mapping: withColumns([DATE, DESCRIPTION, REFERENCE, REFERENCE, AMOUNT]),
    },
    {
      problem: "money read one way",
      mapping: withColumns([DATE, DESCRIPTION, NONE]),
    },
    {
      problem: "money read one way",
      mapping: withColumns([DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN]),
    },
    {
      problem: "money read one way",
      mapping: withColumns([DATE, DESCRIPTION, MONEY_OUT]),
    },
    {
      problem: "money read one way",
      mapping: withColumns(
        [DATE, DESCRIPTION, MONEY_OUT, MONEY_IN, DIRECTION],
        {
          directionWords: DIRECTION_WORDS,
        },
      ),
    },
    {
      problem: "direction words exactly with a direction column",
      mapping: withColumns([DATE, DESCRIPTION, DIRECTION, AMOUNT]),
    },
    {
      problem: "direction words exactly with a direction column",
      mapping: { ...HORIZONTE, directionWords: DIRECTION_WORDS },
    },
    {
      problem: "each direction word one way",
      mapping: withColumns([DATE, DESCRIPTION, DIRECTION, AMOUNT], {
        directionWords: { in: ["C", "debito"], out: ["D", "Débito"] },
      }),
    },
  ])("refuses a mapping without $problem", ({ mapping, problem }) => {
    expect(problemOf(mapping)).toBe(problem);
  });

  it.each([
    { field: "an unknown bank", mapping: { ...HORIZONTE, bankId: "banco" } },
    {
      field: "an unknown role",
      mapping: { ...HORIZONTE, columns: [...HORIZONTE.columns, "saldo"] },
    },
    { field: "a date order", mapping: { ...HORIZONTE, dateOrder: "d/m/y" } },
    {
      field: "a decimal separator",
      mapping: { ...HORIZONTE, decimalSeparator: " " },
    },
    { field: "an extra field", mapping: { ...HORIZONTE, rows: 87 } },
    { field: "a header", mapping: { ...HORIZONTE, header: [], columns: [] } },
    {
      field: "an empty direction word",
      mapping: withColumns([DATE, DESCRIPTION, DIRECTION, AMOUNT], {
        directionWords: { in: [""], out: ["D"] },
      }),
    },
  ])("refuses $field", ({ mapping }) => {
    expect(formatMappingSchema.safeParse(mapping).success).toBe(false);
  });
});
