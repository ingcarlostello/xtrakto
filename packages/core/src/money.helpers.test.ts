import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE } from "./app-error.constants";
import { CURRENCY } from "./money.constants";
import {
  amountFromNumber,
  formatAmount,
  parseAmountText,
  sumAmounts,
} from "./money.helpers";
import type { AmountMinor } from "./money.types";
import { err, ok } from "./result.utils";

const parseFailure = (reason: "format" | "range") =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason } });

const amount = (value: number): AmountMinor => {
  const result = amountFromNumber(value);
  if (!result.ok) throw new Error(`Invalid test amount: ${value}`);
  return result.value;
};

const amountFromText = (text: string): AmountMinor => {
  const result = parseAmountText(text);
  if (!result.ok) throw new Error(`Invalid test amount: ${text}`);
  return result.value;
};

// 10^13 COP, the largest amount the roadmap requires.
const TEN_TRILLION_COP_IN_CENTS = 1_000_000_000_000_000;
// Number.MAX_SAFE_INTEGER cents. Only text can carry it exactly: as a double,
// 90071992547409.91 can't hold its cents.
const MAX_SAFE_COP_TEXT = "90,071,992,547,409.91";

describe("parseAmountText", () => {
  it.each([
    { text: "1,234.56", minor: 123_456 },
    { text: "-15,000.00", minor: -1_500_000 },
    { text: ".00", minor: 0 },
    { text: "-0.00", minor: 0 },
    { text: "0", minor: 0 },
    { text: "12.34", minor: 1_234 },
    { text: "0.01", minor: 1 },
    { text: "-.50", minor: -50 },
    { text: "5.5", minor: 550 },
    { text: "9,876,543", minor: 987_654_300 },
    { text: "1234567.89", minor: 123_456_789 },
    { text: "  1,234.56  ", minor: 123_456 },
    { text: "10,000,000,000,000.00", minor: TEN_TRILLION_COP_IN_CENTS },
    { text: "-10,000,000,000,000.00", minor: -TEN_TRILLION_COP_IN_CENTS },
    { text: "90,071,992,547,409.91", minor: Number.MAX_SAFE_INTEGER },
  ])("parses $text as $minor cents", ({ text, minor }) => {
    expect(parseAmountText(text)).toEqual(ok(minor));
  });

  it("returns a negative zero as plain zero", () => {
    const result = parseAmountText("-0.00");

    expect(result.ok && Object.is(result.value, 0)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "-",
    ".",
    "12.",
    "abc",
    "SUCURSAL",
    "1,23.45",
    "1234,567",
    ",123",
    "12.345",
    "1.234,56",
    "$1,234",
    "+5",
    "--5",
    "1 234",
    "1e5",
    "Infinity",
    "NaN",
  ])("rejects %j", (text) => {
    expect(parseAmountText(text)).toEqual(parseFailure("format"));
  });

  it("rejects amounts beyond the safe integer range", () => {
    expect(parseAmountText("90,071,992,547,409.92")).toEqual(
      parseFailure("range"),
    );
  });
});

describe("amountFromNumber", () => {
  it.each([
    { label: "-50000", value: -50_000, minor: -5_000_000 },
    { label: "12.34", value: 12.34, minor: 1_234 },
    { label: "0", value: 0, minor: 0 },
    { label: "-0", value: -0, minor: 0 },
    // Floating-point traps: multiplying by 100 would drift.
    { label: "0.29 (0.29 * 100 = 28.999…)", value: 0.29, minor: 29 },
    { label: "4.35 (4.35 * 100 = 434.999…)", value: 4.35, minor: 435 },
    { label: "1.15 (1.15 * 100 = 114.999…)", value: 1.15, minor: 115 },
    { label: "0.1 + 0.2", value: 0.1 + 0.2, minor: 30 },
    { label: "-0.1 - 0.2", value: -0.1 - 0.2, minor: -30 },
    { label: "10^13", value: 1e13, minor: TEN_TRILLION_COP_IN_CENTS },
    {
      label: "12345678901234.56",
      value: 12_345_678_901_234.56,
      minor: 1_234_567_890_123_456,
    },
    {
      label: "the largest cell value with exact cents (just below 2^46)",
      value: 70_368_744_177_663.99,
      minor: 7_036_874_417_766_399,
    },
  ])("converts $label to $minor cents", ({ value, minor }) => {
    expect(amountFromNumber(value)).toEqual(ok(minor));
  });

  it.each([
    { label: "1.005 (sub-cent)", value: 1.005 },
    { label: "0.001 (sub-cent)", value: 0.001 },
    { label: "1e-7", value: 1e-7 },
    { label: "NaN", value: Number.NaN },
    { label: "Infinity", value: Number.POSITIVE_INFINITY },
    { label: "-Infinity", value: Number.NEGATIVE_INFINITY },
  ])("rejects $label", ({ value }) => {
    expect(amountFromNumber(value)).toEqual(parseFailure("format"));
  });

  it.each([
    { label: "1e21", value: 1e21 },
    { label: "2^46, where doubles stop holding cents", value: 2 ** 46 },
    { label: "-2^46", value: -(2 ** 46) },
    { label: "90071992547409.91", value: 90_071_992_547_409.91 },
  ])("rejects $label as out of range", ({ value }) => {
    expect(amountFromNumber(value)).toEqual(parseFailure("range"));
  });
});

describe("sumAmounts", () => {
  it("returns zero for no amounts", () => {
    expect(sumAmounts([])).toBe(0);
  });

  it("adds amounts exactly, with mixed signs", () => {
    const amounts = [amount(0.1), amount(0.2), amount(-0.3), amount(12.34)];

    expect(sumAmounts(amounts)).toBe(1_234);
  });

  it("adds amounts in the trillions of pesos exactly", () => {
    const amounts = [amount(1e13), amount(0.01), amount(-1e13)];

    expect(sumAmounts(amounts)).toBe(1);
  });

  it("throws when a partial sum leaves the safe integer range", () => {
    const max = amountFromText(MAX_SAFE_COP_TEXT);
    const amounts = [max, max, amountFromText(`-${MAX_SAFE_COP_TEXT}`)];

    expect(() => sumAmounts(amounts)).toThrow(RangeError);
  });
});

describe("formatAmount", () => {
  it.each([
    { amountText: "8,119,555", display: "$8.119.555" },
    { amountText: "-643,000", display: "\u2212$643.000" },
    { amountText: "12.34", display: "$12,34" },
    { amountText: "12.30", display: "$12,30" },
    { amountText: ".05", display: "$0,05" },
    { amountText: "-.50", display: "\u2212$0,50" },
    { amountText: "0", display: "$0" },
    { amountText: "10,000,000,000,000.00", display: "$10.000.000.000.000" },
    { amountText: MAX_SAFE_COP_TEXT, display: "$90.071.992.547.409,91" },
  ])("formats $amountText as $display in es-CO", ({ amountText, display }) => {
    expect(formatAmount(amountFromText(amountText), CURRENCY.COP)).toBe(
      display,
    );
  });

  it("uses the given locale", () => {
    expect(formatAmount(amount(8_119_555.5), CURRENCY.COP, "en-US")).toBe(
      "$8,119,555.50",
    );
  });
});
