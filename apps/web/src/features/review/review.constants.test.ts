import { CATEGORIZATION_RULES, categoryKind } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { REVIEW_ANSWERS, REVIEW_GROUPS } from "./review.constants";

const RULES = new Map(CATEGORIZATION_RULES.map((rule) => [rule.id, rule]));

const guessingRuleIds = CATEGORIZATION_RULES.flatMap((rule) =>
  "isGuess" in rule && rule.isGuess ? [rule.id] : [],
);

describe("REVIEW_GROUPS", () => {
  it("asks about every rule that guesses, each in one group, and nothing else", () => {
    const asked = REVIEW_GROUPS.flatMap(({ ruleIds }) => ruleIds);

    expect([...asked].sort()).toEqual([...guessingRuleIds].sort());
  });

  it("names each group once, with answers of its own", () => {
    const ids = REVIEW_GROUPS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const { answers } of REVIEW_GROUPS)
      expect(new Set(answers).size).toBe(answers.length);
  });

  // An answered group tells its answer by its movements' category.
  it.for(REVIEW_GROUPS)(
    "gives each of $id's answers a category of its own",
    ({ answers }) => {
      const categories = answers.map((id) => REVIEW_ANSWERS[id].categoryId);

      expect(new Set(categories).size).toBe(categories.length);
    },
  );

  it.for(REVIEW_GROUPS)(
    "offers the guess of $id's rules as its first answer",
    ({ ruleIds, answers }) => {
      const [first] = answers;

      for (const ruleId of ruleIds)
        expect(REVIEW_ANSWERS[first].categoryId).toBe(
          RULES.get(ruleId)?.categoryId,
        );
    },
  );

  // "Lo que está en juego" says what the other answer would change.
  it.for(REVIEW_GROUPS)(
    "weighs one of $id's answers that counts as another kind than its guess",
    ({ ruleIds, answers, whatIf }) => {
      const { categoryId } = REVIEW_ANSWERS[whatIf.answer];
      const kindIf = categoryId === null ? undefined : categoryKind(categoryId);

      expect(answers).toContain(whatIf.answer);
      expect(kindIf).toBeDefined();
      for (const ruleId of ruleIds) {
        const guess = RULES.get(ruleId)?.categoryId;
        expect(guess && categoryKind(guess)).not.toBe(kindIf);
      }
    },
  );

  it.for(REVIEW_GROUPS)(
    "never offers spending for money in, or income for money out, in $id",
    ({ ruleIds, answers }) => {
      const kinds = answers.flatMap((id) => {
        const { categoryId } = REVIEW_ANSWERS[id];
        return categoryId === null ? [] : [categoryKind(categoryId)];
      });

      for (const ruleId of ruleIds)
        expect(kinds).not.toContain(
          RULES.get(ruleId)?.direction === "in" ? "spending" : "income",
        );
    },
  );
});
