import { THRESHOLD_FIGURES } from "./categorization.constants";
import type {
  CategorizationScore,
  CategorizationThresholds,
  ThresholdFigure,
} from "./categorization.types";

const LABELS: Readonly<Record<ThresholdFigure, string>> = {
  accuracy: "accuracy",
  macroF1: "macro-F1",
  coverage: "coverage",
  abstention: "abstention",
};

const figureLine = (
  figure: ThresholdFigure,
  score: CategorizationScore,
  thresholds: CategorizationThresholds,
): string => {
  const value = score[figure];
  const minimum = thresholds[figure];
  const verdict = value >= minimum ? "ok" : "BELOW";
  return `${LABELS[figure].padEnd(11)}${value.toFixed(3)}  min ${minimum.toFixed(2)}  ${verdict}`;
};

/**
 * A model's score as lines of figures only: each threshold's figure, the
 * counts behind them, and each category's F1, worst first. No case's text
 * goes in it.
 */
export const categorizationReport = (
  score: CategorizationScore,
  thresholds: CategorizationThresholds,
): string[] => [
  ...THRESHOLD_FIGURES.map((figure) => figureLine(figure, score, thresholds)),
  `labeled ${score.labeled}, confident ${score.confident}, correct ${score.correct}; vague ${score.vague}, abstained ${score.abstained}`,
  ...[...score.f1ByCategory]
    .sort(([a, f1A], [b, f1B]) => f1A - f1B || a.localeCompare(b))
    .map(([category, f1]) => `  ${category.padEnd(20)}F1 ${f1.toFixed(2)}`),
];
