import type { CategorizationThresholds } from "./categorization.types";

/** The figures a model must reach on the set, in the report's order. */
export const THRESHOLD_FIGURES = [
  "accuracy",
  "macroF1",
  "coverage",
  "abstention",
] as const;

/**
 * The lowest figures each model passes the categorization set with: a few
 * points under the first run's (8.4), where both models reached 0.99 of
 * accuracy, flash covered 0.96 and both left every vague text unsure. One
 * case more or less passes; a prompt that loses several fails.
 */
export const CATEGORIZATION_THRESHOLDS: CategorizationThresholds = {
  accuracy: 0.95,
  macroF1: 0.93,
  coverage: 0.9,
  abstention: 0.85,
};
