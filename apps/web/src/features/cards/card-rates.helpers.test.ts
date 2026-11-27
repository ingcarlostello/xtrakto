import { localDateSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  purchaseRateLine,
  rateFact,
  rateText,
  usuryFact,
  usuryLine,
  usuryViewOf,
} from "./card-rates.helpers";

// Invented: October's usury, 28,34% a year, is 2.1010% a month.
const OCTOBER = new Map([["2026-10", 283_400]]);
const CLOSED_ON = localDateSchema.parse("2026-10-10");

describe("a card's rate in words", () => {
  it("reads a rate with two decimals, a month's and the year it makes", () => {
    expect(rateText(19_000)).toBe("1,90%");
    expect(rateText(283_400)).toBe("28,34%");
    expect(purchaseRateLine(19_000)).toBe(
      "Tasa de compras: 1,90% al mes, 25,34% efectivo anual.",
    );
    expect(rateFact(20_500)).toBe("2,05% al mes · 27,57% efectivo anual");
  });
});

describe("usuryViewOf", () => {
  it("says where a rate stands against the usury of the month its statement closed in", () => {
    const below = usuryViewOf(
      { monthlyRatePpm: 20_500, bank: "nu" },
      CLOSED_ON,
      OCTOBER,
    );
    expect(below).toEqual({
      standing: "below",
      month: "oct 2026",
      usury: "28,34% efectivo anual",
    });
    expect(below && usuryLine(below)).toBe(
      "Por debajo de la usura de oct 2026: 28,34% efectivo anual.",
    );
    expect(
      usuryFact({
        standing: "at",
        month: "oct 2026",
        usury: "28,34% efectivo anual",
      }),
    ).toBe("28,34% efectivo anual · en el tope");
  });

  it("says what to do past the usury, and nothing without the month's", () => {
    const above = usuryViewOf(
      { monthlyRatePpm: 21_100, bank: "nu" },
      CLOSED_ON,
      OCTOBER,
    );
    expect(above && usuryLine(above)).toBe(
      "Esta tasa pasa la usura de oct 2026: 28,34% efectivo anual. Por ley no puede cobrar más: pídele a tu banco que la revise.",
    );
    expect(
      usuryViewOf(
        { monthlyRatePpm: 21_100, bank: "nu" },
        localDateSchema.parse("2026-11-10"),
        OCTOBER,
      ),
    ).toBeUndefined();
  });
});
