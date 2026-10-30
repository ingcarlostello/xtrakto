import { type CategoryId, isPlainTitle } from "@xtrakto/core";
import { THRESHOLD_FIGURES } from "./categorization.constants";
import type {
  CategorizationPrediction,
  CategorizationScore,
  CategorizationThresholds,
  ThresholdFigure,
} from "./categorization.types";

type ConfidentAnswer = {
  readonly expected: CategoryId;
  readonly answered: CategoryId;
};

/** A part of a whole, from 0 to 1; 0 when there is nothing to count. */
const share = (part: number, whole: number): number =>
  whole === 0 ? 0 : part / whole;

const confidentAnswerOf = (
  { answer }: CategorizationPrediction,
  threshold: number,
) =>
  answer !== undefined && answer.confidence >= threshold ? answer : undefined;

const confidentAnswersOf = (
  predictions: readonly CategorizationPrediction[],
  threshold: number,
): ConfidentAnswer[] =>
  predictions.flatMap((prediction) => {
    const answer = confidentAnswerOf(prediction, threshold);
    return prediction.expected === null || answer === undefined
      ? []
      : [{ expected: prediction.expected, answered: answer.categoryId }];
  });

// F1 = 2TP / (2TP + FP + FN), where TP + FP are the category's answers and
// TP + FN its expected cases.
const f1Of = (
  category: CategoryId,
  answers: readonly ConfidentAnswer[],
): number => {
  const countOf = (matches: (answer: ConfidentAnswer) => boolean) =>
    answers.filter(matches).length;
  const right = countOf(
    ({ expected, answered }) => expected === category && answered === category,
  );
  const given = countOf(({ answered }) => answered === category);
  const expected = countOf((answer) => answer.expected === category);
  return share(2 * right, given + expected);
};

const f1ByCategoryOf = (
  answers: readonly ConfidentAnswer[],
): ReadonlyMap<CategoryId, number> => {
  const categories = new Set(
    answers.flatMap(({ expected, answered }) => [expected, answered]),
  );
  return new Map(
    [...categories].map((category) => [category, f1Of(category, answers)]),
  );
};

const meanOf = (values: readonly number[]): number =>
  share(
    values.reduce((sum, value) => sum + value, 0),
    values.length,
  );

/**
 * How a model did on a set: only the answers at or above the confidence
 * threshold count, since only those are saved (8.5b). Accuracy and macro-F1
 * are for them, coverage says how many of the labeled cases they reach, and
 * abstention how many vague cases the model left below the threshold.
 */
export const scoreCategorization = (
  predictions: readonly CategorizationPrediction[],
  confidenceThreshold: number,
): CategorizationScore => {
  const labeled = predictions.filter(({ expected }) => expected !== null);
  const vague = predictions.filter(({ expected }) => expected === null);
  const answers = confidentAnswersOf(labeled, confidenceThreshold);
  const correct = answers.filter(
    ({ expected, answered }) => expected === answered,
  ).length;
  const f1ByCategory = f1ByCategoryOf(answers);
  const abstained = vague.filter(
    (prediction) =>
      confidentAnswerOf(prediction, confidenceThreshold) === undefined,
  ).length;
  const answered = predictions.flatMap(({ answer }) => answer ?? []);
  const titled = answered.filter(
    ({ title }) => title !== null && isPlainTitle(title),
  ).length;
  return {
    labeled: labeled.length,
    confident: answers.length,
    correct,
    accuracy: share(correct, answers.length),
    macroF1: meanOf([...f1ByCategory.values()]),
    f1ByCategory,
    coverage: share(answers.length, labeled.length),
    vague: vague.length,
    abstained,
    abstention: share(abstained, vague.length),
    titled,
    titleShare: share(titled, answered.length),
  };
};

/** The figures of a score under their thresholds. */
export const failedThresholds = (
  score: CategorizationScore,
  thresholds: CategorizationThresholds,
): ThresholdFigure[] =>
  THRESHOLD_FIGURES.filter((figure) => score[figure] < thresholds[figure]);
