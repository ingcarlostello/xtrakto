import type { CategoryId } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  failedThresholds,
  scoreCategorization,
} from "./categorization-score.helpers";
import type { CategorizationPrediction } from "./categorization.types";

const THRESHOLD = 0.7;

const answered = (
  expected: CategoryId | null,
  categoryId: CategoryId,
  {
    confidence = 0.9,
    title = "Compra en una tienda",
  }: { confidence?: number; title?: string | null } = {},
): CategorizationPrediction => ({
  expected,
  answer: { categoryId, confidence, title },
});

const unanswered = (expected: CategoryId | null): CategorizationPrediction => ({
  expected,
});

describe("scoreCategorization", () => {
  it("counts only the answers at or above the confidence threshold", () => {
    const score = scoreCategorization(
      [
        answered("groceries", "groceries", { confidence: 0.7 }),
        answered("health", "health", { confidence: 0.69 }),
        unanswered("transport"),
        answered("shopping", "groceries"),
      ],
      THRESHOLD,
    );

    expect(score).toMatchObject({
      labeled: 4,
      confident: 2,
      correct: 1,
      accuracy: 0.5,
      coverage: 0.5,
    });
  });

  it("averages each category's F1, so a small category weighs as much as a large one", () => {
    // groceries: 3 right of 3 given and 3 expected, F1 1; shopping: 0 right
    // of 1 expected, F1 0; restaurants: 0 right of 1 given, F1 0.
    const score = scoreCategorization(
      [
        answered("groceries", "groceries"),
        answered("groceries", "groceries"),
        answered("groceries", "groceries"),
        answered("shopping", "restaurants"),
      ],
      THRESHOLD,
    );

    expect(score.accuracy).toBe(0.75);
    expect(score.macroF1).toBeCloseTo(1 / 3);
    expect(score.f1ByCategory).toEqual(
      new Map([
        ["groceries", 1],
        ["shopping", 0],
        ["restaurants", 0],
      ]),
    );
  });

  it("weighs a category's precision and recall together", () => {
    // health: 1 right of 2 given and 1 expected, F1 = 2·1 / (2 + 1).
    const score = scoreCategorization(
      [answered("health", "health"), answered("shopping", "health")],
      THRESHOLD,
    );

    expect(score.f1ByCategory.get("health")).toBeCloseTo(2 / 3);
  });

  it("says how many vague texts the model left below the threshold", () => {
    const score = scoreCategorization(
      [
        answered(null, "shopping", { confidence: 0.4 }),
        unanswered(null),
        answered(null, "shopping", { confidence: 0.95 }),
        answered("groceries", "groceries"),
      ],
      THRESHOLD,
    );

    expect(score).toMatchObject({
      labeled: 1,
      vague: 3,
      abstained: 2,
      accuracy: 1,
      coverage: 1,
    });
    expect(score.abstention).toBeCloseTo(2 / 3);
  });

  it("gives 0 for a figure with nothing to count", () => {
    expect(scoreCategorization([], THRESHOLD)).toMatchObject({
      accuracy: 0,
      macroF1: 0,
      coverage: 0,
      abstention: 0,
    });
  });
});

describe("the titles' share", () => {
  it("counts the answers, at any confidence, whose title reads in plain words", () => {
    const score = scoreCategorization(
      [
        answered("groceries", "groceries"),
        answered(null, "shopping", { confidence: 0.3 }),
        answered("health", "health", { title: null }),
        answered("health", "health", { title: "Pago a [NAME]" }),
        unanswered("transport"),
      ],
      THRESHOLD,
    );

    expect(score).toMatchObject({ titled: 2, titleShare: 0.5 });
  });
});

describe("failedThresholds", () => {
  const score = scoreCategorization(
    [
      answered("groceries", "groceries"),
      answered("shopping", "restaurants"),
      unanswered("health"),
      unanswered(null),
    ],
    THRESHOLD,
  );

  it("names the figures under their thresholds", () => {
    expect(
      failedThresholds(score, {
        accuracy: 0.6,
        macroF1: 0.3,
        coverage: 0.7,
        abstention: 1,
        titleShare: 1,
      }),
    ).toEqual(["accuracy", "coverage"]);
  });

  it("passes a figure that reaches its threshold exactly", () => {
    expect(
      failedThresholds(score, {
        accuracy: 0.5,
        macroF1: 1 / 3,
        coverage: 2 / 3,
        abstention: 1,
        titleShare: 1,
      }),
    ).toEqual([]);
  });
});
