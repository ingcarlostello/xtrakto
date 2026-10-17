import { describe, expect, it } from "vitest";
import { foldText } from "../text/text.utils";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import type { CategorizationRule } from "./categorization.types";

const SNAKE_CASE = /^[a-z]+(_[a-z0-9]+)*$/;
// Prefixes are whole words; keywords may end a word with `*`, for a stem.
const PREFIX = /^[A-Z0-9]+( [A-Z0-9]+)*$/;
const KEYWORD = /^[A-Z0-9]+\*?( [A-Z0-9]+\*?)*$/;
const MIN_STEM_LENGTH = 4;
const LOWERCASE_START = /^\p{Ll}/u;

const RULES: readonly CategorizationRule[] = CATEGORIZATION_RULES;
const ids = RULES.map(({ id }) => id);
const prefixes = RULES.flatMap(({ startsWith = [] }) => startsWith);
const keywords = RULES.flatMap(({ words = [] }) => words);

describe("CATEGORIZATION_RULES", () => {
  it("names each rule once, in snake_case", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !SNAKE_CASE.test(id))).toEqual([]);
  });

  it("gives every rule something to match", () => {
    const empty = RULES.filter(
      ({ is, startsWith, words }) =>
        is === undefined && startsWith === undefined && words === undefined,
    );

    expect(empty).toEqual([]);
  });

  it("writes its texts folded, as the words a description splits into", () => {
    const texts = [...prefixes, ...keywords];

    expect(prefixes.filter((prefix) => !PREFIX.test(prefix))).toEqual([]);
    expect(keywords.filter((keyword) => !KEYWORD.test(keyword))).toEqual([]);
    expect(texts.filter((text) => foldText(text) !== text)).toEqual([]);
  });

  it("only uses stems long enough to mean something", () => {
    const stems = keywords
      .flatMap((keyword) => keyword.split(" "))
      .filter((word) => word.endsWith("*"));

    expect(stems.filter((stem) => stem.length - 1 < MIN_STEM_LENGTH)).toEqual(
      [],
    );
  });

  it("explains every rule in lowercase, without a final period", () => {
    const unclear = RULES.filter(
      ({ reasonEs }) =>
        !LOWERCASE_START.test(reasonEs) || reasonEs.endsWith("."),
    );

    expect(unclear).toEqual([]);
  });

  it("puts each merchant word in one category only", () => {
    const merchantWords = RULES.filter(({ id }) =>
      id.startsWith("merchant_"),
    ).flatMap(({ words = [] }) => words);

    expect(
      merchantWords.filter(
        (word, index) => merchantWords.indexOf(word) !== index,
      ),
    ).toEqual([]);
  });

  it("only guesses for the movements the quick review asks about", () => {
    const guesses = RULES.filter(({ isGuess }) => isGuess).map(({ id }) => id);

    expect(guesses).toEqual([
      "no_description_out",
      "no_description_in",
      "corresponsal_deposit",
      "nequi_in",
      "key_payment_saving",
      "key_payment",
      "pse_investment",
      "pse_card",
      "pse_loan",
    ]);
  });
});
