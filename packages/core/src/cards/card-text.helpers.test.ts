import { describe, expect, it } from "vitest";
import {
  parseCardDate,
  parseCardPeriod,
  parsePercentText,
} from "./card-text.helpers";

// Invented dates and rates, written as each card's statement writes them.

describe("parseCardDate", () => {
  it.each([
    ["30 sep. 2026", "2026-09-30"],
    ["04 OCT 2026", "2026-10-04"],
    ["10 SEPTIEMBRE 2026", "2026-09-10"],
    ["30/09/2026", "2026-09-30"],
    ["05/10/2026", "2026-10-05"],
    ["oct. 15, 2026", "2026-10-15"],
    ["  ene. 5, 2027 ", "2027-01-05"],
  ])("reads %s", (text, date) => {
    expect(parseCardDate(text)).toEqual({ ok: true, value: date });
  });

  it.each(["-", "", "15 2026", "oct. 32, 2026", "31 abc 2026", "2026/09/30"])(
    "refuses %j",
    (text) => {
      expect(parseCardDate(text)).toMatchObject({
        ok: false,
        error: { code: "PARSE_FAILED" },
      });
    },
  );
});

describe("parseCardPeriod", () => {
  it.each([
    ["31 ago - 30 sep. 2026", "2026-08-31", "2026-09-30"],
    ["12 AGO - 10 SEP 2026", "2026-08-12", "2026-09-10"],
    ["16 dic - 15 ene. 2027", "2026-12-16", "2027-01-15"],
    ["1 ene - 31 dic. 2026", "2026-01-01", "2026-12-31"],
    ["31 ago-30 sep. 2026", "2026-08-31", "2026-09-30"],
  ])("reads %s, its first day in the year it falls", (text, from, to) => {
    expect(parseCardPeriod(text)).toEqual({ ok: true, value: { from, to } });
  });

  it.each([
    "31 ago 30 sep. 2026",
    "31 ago - 30 sep.",
    "31 abc - 30 sep. 2026",
    "ago - 30 sep. 2026",
    "31 ago - -",
  ])("refuses %j", (text) => {
    expect(parseCardPeriod(text)).toMatchObject({
      ok: false,
      error: { code: "PARSE_FAILED" },
    });
  });
});

describe("parsePercentText", () => {
  it.each([
    ["1.9000 %", 19_000],
    ["1,2000", 12_000],
    ["2.05%", 20_500],
    ["25.3400 %", 253_400],
    ["0.0000 %", 0],
    ["12 %", 120_000],
    [" 7,5 ", 75_000],
  ])("reads %j in parts per million", (text, ppm) => {
    expect(parsePercentText(text)).toEqual({ ok: true, value: ppm });
  });

  it.each(["1.23456 %", "-1.9 %", "1,234.5 %", "1.000,5", "abc", "", "%"])(
    "refuses %j",
    (text) => {
      expect(parsePercentText(text)).toMatchObject({
        ok: false,
        error: { code: "PARSE_FAILED" },
      });
    },
  );
});
