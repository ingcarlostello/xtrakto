import { type MoneyDirection, redactPii } from "@xtrakto/core";
import type {
  CachedLlmCategory,
  LlmMovementCategory,
  LlmText,
  LlmWaitingText,
} from "@xtrakto/db";
import type { AiModelId } from "@/lib/ai";
import {
  LLM_CATEGORY_CHOICES,
  MIN_LLM_CONFIDENCE,
} from "./llm-categories.constants";
import type {
  LlmCategoryAnswer,
  LlmTextGroup,
  TextToCategorize,
} from "./llm-categories.types";
import type { CategorizeAnswer } from "./prompts/categorize.v1";

/** Consecutive slices of at most `size` items, each with where it starts. */
export const batchesOf = <T>(
  items: readonly T[],
  size: number,
): { readonly start: number; readonly items: readonly T[] }[] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, batch) => ({
    start: batch * size,
    items: items.slice(batch * size, (batch + 1) * size),
  }));

// Redacted once more, so what a caller missed never leaves (project rules
// §13), and on one line, so the numbering holds.
const lineOf = ({ text, direction }: TextToCategorize, index: number) =>
  `${index + 1}. ${direction} | ${redactPii(text).replace(/\s+/g, " ").trim()}`;

/** The prompt's input for a batch: one numbered line per text, from 1. */
export const categorizeInput = (texts: readonly TextToCategorize[]): string =>
  texts.map(lineOf).join("\n");

const isChoiceFor = (direction: MoneyDirection, category: string): boolean =>
  LLM_CATEGORY_CHOICES[direction].some((choice) => choice === category);

/**
 * Each text's answer, by its position in the batch, with the model that
 * gave it. An answer for a line the batch doesn't have, a second one for a
 * line, and a category its money's direction doesn't allow are dropped:
 * those texts wait.
 */
export const answersOf = (
  texts: readonly TextToCategorize[],
  { answers }: CategorizeAnswer,
  model: AiModelId,
): Map<number, LlmCategoryAnswer> => {
  const byIndex = new Map<number, LlmCategoryAnswer>();
  for (const { line, category, confidence } of answers) {
    const index = line - 1;
    const text = texts[index];
    if (text === undefined || byIndex.has(index)) continue;
    if (!isChoiceFor(text.direction, category)) continue;
    byIndex.set(index, { categoryId: category, confidence, model });
  }
  return byIndex;
};

const keyOf = ({ direction, redactedText }: LlmText) =>
  `${direction} ${redactedText}`;

/**
 * The texts the LLM reads for the user's waiting ones (8.5b): each redacted
 * with the user's holder names, and once with the bank's texts it stands
 * for, such as two Nequi numbers that both read "[PHONE]".
 */
export const textGroupsOf = (
  waiting: readonly LlmWaitingText[],
  holderNames: readonly string[],
): LlmTextGroup[] => {
  const groups = new Map<string, LlmTextGroup & { descriptions: string[] }>();
  for (const { descriptionNormalized, direction } of waiting) {
    const redactedText = redactPii(descriptionNormalized, {
      knownNames: holderNames,
    });
    const key = keyOf({ redactedText, direction });
    const group = groups.get(key) ?? {
      redactedText,
      direction,
      descriptions: [],
    };
    group.descriptions.push(descriptionNormalized);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** The groups whose text the cache has no answer for, in their order. */
export const uncachedGroups = (
  groups: readonly LlmTextGroup[],
  cached: readonly LlmText[],
): LlmTextGroup[] => {
  const known = new Set(cached.map(keyOf));
  return groups.filter((group) => !known.has(keyOf(group)));
};

/** A batch's answers as the cache keeps them, under the threshold too. */
export const cachedAnswersOf = (
  batch: readonly LlmTextGroup[],
  answers: ReadonlyMap<number, LlmCategoryAnswer>,
): CachedLlmCategory[] =>
  batch.flatMap(({ redactedText, direction }, index) => {
    const answer = answers.get(index);
    return answer === undefined ? [] : [{ redactedText, direction, ...answer }];
  });

/**
 * The categories the user's movements take: each answer's from the
 * confidence threshold, for every bank text its redacted text stands for.
 */
export const movementCategoriesOf = (
  groups: readonly LlmTextGroup[],
  answers: readonly CachedLlmCategory[],
): LlmMovementCategory[] => {
  const confident = new Map(
    answers
      .filter(({ confidence }) => confidence >= MIN_LLM_CONFIDENCE)
      .map((answer) => [keyOf(answer), answer.categoryId]),
  );
  return groups.flatMap(({ descriptions, ...text }) => {
    const categoryId = confident.get(keyOf(text));
    return categoryId === undefined
      ? []
      : descriptions.map((descriptionNormalized) => ({
          descriptionNormalized,
          direction: text.direction,
          categoryId,
        }));
  });
};
