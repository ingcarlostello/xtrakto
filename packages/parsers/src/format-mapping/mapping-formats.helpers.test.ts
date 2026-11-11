import { DATE_ORDER, DECIMAL_SEPARATOR } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  dateOrderOf,
  decimalSeparatorOf,
  directionWordsOf,
} from "./mapping-formats.helpers";

const { DAY_MONTH_YEAR, MONTH_DAY_YEAR, YEAR_MONTH_DAY } = DATE_ORDER;
const { COMMA, POINT } = DECIMAL_SEPARATOR;

describe("dateOrderOf", () => {
  it.each([
    { order: DAY_MONTH_YEAR, cells: ["15/03/2026", "02/09/2026"] },
    { order: DAY_MONTH_YEAR, cells: ["02/09/2026 10:15", "30-sep-2026"] },
    { order: MONTH_DAY_YEAR, cells: ["03/15/2026", "09/02/2026"] },
    { order: YEAR_MONTH_DAY, cells: ["2026-09-02", "2026-09-30"] },
  ])(
    "reads $cells in the one order that reads them all",
    ({ order, cells }) => {
      expect(dateOrderOf(cells)).toBe(order);
    },
  );

  it("puts the day first when more orders read every date", () => {
    expect(dateOrderOf(["02/09/2026", "05/09/2026"])).toBe(DAY_MONTH_YEAR);
  });

  it("puts the day first for date cells, which read in any order", () => {
    expect(dateOrderOf([{ excelSerial: 46_295 }])).toBe(DAY_MONTH_YEAR);
  });

  it("passes over what isn't a date", () => {
    expect(dateOrderOf(["TOTAL", null, "03/15/2026"])).toBe(MONTH_DAY_YEAR);
  });

  it("has none when no order reads every date, or there are none", () => {
    expect(dateOrderOf(["15/03/2026", "03/15/2026"])).toBeUndefined();
    expect(dateOrderOf(["TOTAL", 12])).toBeUndefined();
  });
});

describe("decimalSeparatorOf", () => {
  it.each([
    { separator: COMMA, cells: ["85.400,00", "-1.200,5", "-$ 4.200.000,00"] },
    { separator: POINT, cells: ["85,400.00", "(1,200.50)", "12.15 CR"] },
    { separator: COMMA, cells: ["85.400", "1.234.567"] },
    { separator: POINT, cells: ["85,400", "1,234,567"] },
  ])("reads $separator from $cells", ({ separator, cells }) => {
    expect(decimalSeparatorOf(cells)).toBe(separator);
  });

  it("takes what most amounts say", () => {
    expect(decimalSeparatorOf(["85,400.00", "1,200.00", "12,15"])).toBe(POINT);
  });

  it("takes a comma when no amount says", () => {
    expect(decimalSeparatorOf([85_400, -12.15, "85400", null])).toBe(COMMA);
  });

  it("takes a comma when as many say each", () => {
    expect(decimalSeparatorOf(["85,400.00", "1.200,00"])).toBe(COMMA);
  });
});

describe("directionWordsOf", () => {
  it.each([
    { cells: ["D", "C", "D"], words: { in: ["C"], out: ["D"] } },
    {
      cells: ["Débito", "Crédito"],
      words: { in: ["CREDITO"], out: ["DEBITO"] },
    },
    { cells: ["-", "+"], words: { in: ["+"], out: ["-"] } },
    {
      cells: ["CARGO", "ABONO", null, " "],
      words: { in: ["ABONO"], out: ["CARGO"] },
    },
    { cells: ["DB", "CR", "DR"], words: { in: ["CR"], out: ["DB", "DR"] } },
  ])("reads $cells", ({ cells, words }) => {
    expect(directionWordsOf(cells)).toEqual(words);
  });

  it("has none when a word isn't one banks use for a way", () => {
    expect(directionWordsOf(["D", "C", "X"])).toBeUndefined();
  });

  it("has none when a way has no word", () => {
    expect(directionWordsOf(["D", "D"])).toBeUndefined();
    expect(directionWordsOf([1, 2])).toBeUndefined();
  });
});
