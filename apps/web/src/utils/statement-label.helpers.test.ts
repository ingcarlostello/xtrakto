import { periodSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { statementLabel, statementPeriodText } from "./statement-label.helpers";

const period = (from: string, to: string) => periodSchema.parse({ from, to });

describe("statementLabel", () => {
  it.each([
    [
      "bancolombia-savings-quarterly",
      period("2026-06-30", "2026-09-30"),
      "Extracto trimestral jul–sep 2026",
    ],
    [
      "bancolombia-movements-export",
      period("2026-08-15", "2026-08-31"),
      "Movimientos 15–31 ago 2026",
    ],
    // A format no parser has: its id, and its period as days.
    [
      "another-format",
      period("2026-08-15", "2026-08-31"),
      "another-format 15–31 ago 2026",
    ],
    // A card's statement, by the month it closes in (12.3b), its first day
    // in the month before or not.
    [
      "nu-credit-card-pdf",
      period("2026-08-12", "2026-09-10"),
      "Extracto de tu tarjeta sep 2026",
    ],
    [
      "bancolombia-credit-card",
      period("2026-08-31", "2026-09-30"),
      "Extracto de tu tarjeta sep 2026",
    ],
    [
      "bancolombia-credit-card-pdf",
      period("2026-12-16", "2027-01-15"),
      "Extracto de tu tarjeta ene 2027",
    ],
  ])("names %s by its format and period", (formatId, days, label) => {
    expect(statementLabel(formatId, days)).toBe(label);
  });
});

describe("statementPeriodText", () => {
  const RANGE = period("2026-07-31", "2026-08-31");

  it("reads a period as the page read it, else as its format does", () => {
    expect(statementPeriodText("mapped-spreadsheet", RANGE)).toBe(
      "31 jul – 31 ago 2026",
    );
    expect(statementPeriodText("mapped-spreadsheet", RANGE, "statement")).toBe(
      "ago 2026",
    );
    expect(statementPeriodText("nu-credit-card-pdf", RANGE, "rows")).toBe(
      "ago 2026",
    );
  });
});
