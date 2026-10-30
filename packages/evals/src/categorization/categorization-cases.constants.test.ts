import {
  amountMinorSchema,
  categorizeByRules,
  categoryKind,
  MONEY_DIRECTION,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { CATEGORIZATION_CASES } from "./categorization-cases.constants";

// What a labeled text's category must count as, by its money's direction:
// the LLM never says money only moved (8.4).
const KIND_BY_DIRECTION = {
  [MONEY_DIRECTION.OUT]: "spending",
  [MONEY_DIRECTION.IN]: "income",
} as const;

const AMOUNT_BY_DIRECTION = {
  [MONEY_DIRECTION.OUT]: amountMinorSchema.parse(-5_000_000),
  [MONEY_DIRECTION.IN]: amountMinorSchema.parse(5_000_000),
};

describe("CATEGORIZATION_CASES", () => {
  it("holds at least 200 texts, each once", () => {
    const texts = CATEGORIZATION_CASES.map(({ text }) => text);

    expect(texts.length).toBeGreaterThanOrEqual(200);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("keeps some vague texts, which a model should answer with low confidence", () => {
    const vague = CATEGORIZATION_CASES.filter(({ expected }) => !expected);

    expect(vague.length).toBeGreaterThanOrEqual(20);
  });

  it("expects only a category that counts as its money's direction says", () => {
    const misfits = CATEGORIZATION_CASES.filter(
      ({ direction, expected }) =>
        expected !== null &&
        categoryKind(expected) !== KIND_BY_DIRECTION[direction],
    );

    expect(misfits).toEqual([]);
  });

  it("holds only texts the rules don't name, besides a merchant they don't know", () => {
    const named = CATEGORIZATION_CASES.filter(({ text, direction }) => {
      const match = categorizeByRules({
        descriptionNormalized: text,
        amountMinor: AMOUNT_BY_DIRECTION[direction],
      });
      return match !== null && match.ruleId !== "unknown_merchant";
    });

    expect(named).toEqual([]);
  });

  it("writes texts as the bank's, normalized: uppercase, with single spaces", () => {
    const unlike = CATEGORIZATION_CASES.filter(
      ({ text }) => text !== text.toUpperCase() || /\s{2,}/.test(text),
    );

    expect(unlike).toEqual([]);
  });
});
