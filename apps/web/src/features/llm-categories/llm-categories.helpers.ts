import { type MoneyDirection, redactPii } from "@xtrakto/core";
import { LLM_CATEGORY_CHOICES } from "./llm-categories.constants";
import type {
  LlmCategoryAnswer,
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
 * Each text's answer, by its position in the batch. An answer for a line
 * the batch doesn't have, a second one for a line, and a category its
 * money's direction doesn't allow are dropped: those texts wait.
 */
export const answersOf = (
  texts: readonly TextToCategorize[],
  { answers }: CategorizeAnswer,
): Map<number, LlmCategoryAnswer> => {
  const byIndex = new Map<number, LlmCategoryAnswer>();
  for (const { line, category, confidence } of answers) {
    const index = line - 1;
    const text = texts[index];
    if (text === undefined || byIndex.has(index)) continue;
    if (!isChoiceFor(text.direction, category)) continue;
    byIndex.set(index, { categoryId: category, confidence });
  }
  return byIndex;
};
