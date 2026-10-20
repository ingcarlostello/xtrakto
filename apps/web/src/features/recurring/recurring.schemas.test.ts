import { describe, expect, it } from "vitest";
import { recurringSearchSchema } from "./recurring.schemas";

describe("recurringSearchSchema", () => {
  it("reads the period and the payments that stopped", () => {
    expect(
      recurringSearchSchema.parse({ period: "2026-q3", filter: "stopped" }),
    ).toEqual({
      period: { kind: "quarter", year: 2026, quarter: 3 },
      filter: "stopped",
    });
  });

  it.each([
    ["a kind of Movimientos", "moved"],
    ["a repeated param", ["stopped", "stopped"]],
  ])("shows the payments expected for %s", (_, filter) => {
    expect(recurringSearchSchema.parse({ filter }).filter).toBeUndefined();
  });
});
