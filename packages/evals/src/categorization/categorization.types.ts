import type { CategoryId, MoneyDirection } from "@xtrakto/core";
import type { THRESHOLD_FIGURES } from "./categorization.constants";

/**
 * One text of the set: an invented bank text that no rule of the table
 * names, the way its money goes, and the category a person would give it.
 * `null` marks a text too vague to tell, which a model should answer with
 * low confidence.
 */
export type CategorizationCase = {
  readonly text: string;
  readonly direction: MoneyDirection;
  readonly expected: CategoryId | null;
};

/** What a model answered for one case, or nothing when it gave no answer. */
export type CategorizationPrediction = {
  readonly expected: CategoryId | null;
  readonly answer?: {
    readonly categoryId: CategoryId;
    readonly confidence: number;
    /** What was paid, in plain words, when the model gave one (8.6b). */
    readonly title: string | null;
  };
};

/** How a model did on a set, in figures only. */
export type CategorizationScore = {
  /** Cases with a category to find. */
  readonly labeled: number;
  /** Of those, the ones answered at or above the confidence threshold. */
  readonly confident: number;
  /** Of those, the ones answered right. */
  readonly correct: number;
  /** Right answers among the confident ones, from 0 to 1. */
  readonly accuracy: number;
  /** The mean of each category's F1 over the confident answers, from 0 to 1. */
  readonly macroF1: number;
  /** Each category's F1, for the categories the confident answers expect or give. */
  readonly f1ByCategory: ReadonlyMap<CategoryId, number>;
  /** Confident answers among the labeled cases, from 0 to 1. */
  readonly coverage: number;
  /** Vague cases: those the set marks `null`. */
  readonly vague: number;
  /** Of those, the ones answered below the threshold, or not at all. */
  readonly abstained: number;
  /** Abstained among the vague cases, from 0 to 1. */
  readonly abstention: number;
  /** Answers, at any confidence, with a title in plain words (8.6b). */
  readonly titled: number;
  /** Titled among the answers, from 0 to 1. */
  readonly titleShare: number;
};

/** A figure of the score that has a threshold. */
export type ThresholdFigure = (typeof THRESHOLD_FIGURES)[number];

/** The lowest figures a model passes the set with. */
export type CategorizationThresholds = Pick<
  CategorizationScore,
  ThresholdFigure
>;
