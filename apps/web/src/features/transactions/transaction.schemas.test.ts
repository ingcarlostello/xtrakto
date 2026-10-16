import { describe, expect, it } from "vitest";
import { shownCountSchema } from "./transaction.schemas";

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
