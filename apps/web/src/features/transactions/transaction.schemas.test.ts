import { describe, expect, it } from "vitest";
import {
  shownCountSchema,
  transactionsSearchSchema,
} from "./transaction.schemas";

describe("shownCountSchema", () => {
  it.each([
    ["60", 60],
    ["45", 45],
    ["2000", 2_000],
  ])("shows %s movements when the URL asks for them", (value, expected) => {
    expect(shownCountSchema.parse(value)).toBe(expected);
  });

  it.each([
    ["no param", undefined],
    ["a word", "todos"],
    ["fewer than a step", "10"],
    ["more than the list holds", "2001"],
    ["a fraction", "45.5"],
    ["a repeated param", ["60", "90"]],
  ])("shows the first 30 for %s", (_, value) => {
    expect(shownCountSchema.parse(value)).toBe(30);
  });
});

describe("transactionsSearchSchema", () => {
  const ACCOUNT = "3f1c6a52-6d3b-4c4e-9a53-1d2f0b7e8a90";

  it("reads the account, the period and how many show", () => {
    expect(
      transactionsSearchSchema.parse({
        account: ACCOUNT,
        period: "2026-q3",
        show: "60",
      }),
    ).toEqual({
      account: ACCOUNT,
      period: { kind: "quarter", year: 2026, quarter: 3 },
      show: 60,
    });
  });

  it("reads the search trimmed, and an empty or overlong one as none", () => {
    const searchOf = (q: unknown) => transactionsSearchSchema.parse({ q }).q;

    expect(searchOf("  nequi ")).toBe("nequi");
    expect(searchOf("   ")).toBeUndefined();
    expect(searchOf("x".repeat(61))).toBeUndefined();
    expect(searchOf(["nequi", "pse"])).toBeUndefined();
  });

  it("reads a filter by kind, or what waits for review", () => {
    const filterOf = (filter: unknown) =>
      transactionsSearchSchema.parse({ filter }).filter;

    expect(filterOf("moved")).toBe("moved");
    expect(filterOf("review")).toBe("review");
    expect(filterOf("internal")).toBeUndefined();
  });

  it("reads the movement whose detail opens", () => {
    expect(transactionsSearchSchema.parse({ movement: ACCOUNT }).movement).toBe(
      ACCOUNT,
    );
  });

  it("leaves out what doesn't parse, so the list opens on its defaults", () => {
    expect(
      transactionsSearchSchema.parse({
        account: "not-an-id",
        period: ["2026-q3", "2026-08"],
        filter: ["income", "moved"],
        show: "todos",
        movement: "3001234567",
      }),
    ).toEqual({ show: 30 });
  });
});
