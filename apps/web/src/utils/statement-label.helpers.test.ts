import { periodSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { statementLabel } from "./statement-label.helpers";

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
  ])("names %s by its format and period", (formatId, days, label) => {
    expect(statementLabel(formatId, days)).toBe(label);
  });
});
