import { MONEY_DIRECTION } from "@xtrakto/core";
import { and, eq, inArray, or } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { llmCategoryAnswers } from "./llm-category-answer.schemas";
import type {
  CachedLlmCategory,
  LlmPromptVersion,
  LlmText,
} from "./llm-category.types";

// One `in` for each direction's texts.
const textsGoingTheirWay = (texts: readonly LlmText[]) =>
  Object.values(MONEY_DIRECTION).map((direction) => {
    const going = texts
      .filter((text) => text.direction === direction)
      .map(({ redactedText }) => redactedText);
    return going.length === 0
      ? undefined
      : and(
          eq(llmCategoryAnswers.direction, direction),
          inArray(llmCategoryAnswers.redactedText, going),
        );
  });

/** The answers a prompt's version gave these texts, those the cache has. */
export const findCachedLlmCategories = async (
  { tx }: UserContext,
  prompt: LlmPromptVersion,
  texts: readonly LlmText[],
): Promise<CachedLlmCategory[]> => {
  // Without texts, `or()` would be no filter at all.
  if (texts.length === 0) return [];
  return tx
    .select({
      redactedText: llmCategoryAnswers.redactedText,
      direction: llmCategoryAnswers.direction,
      categoryId: llmCategoryAnswers.categoryId,
      confidence: llmCategoryAnswers.confidence,
      model: llmCategoryAnswers.model,
    })
    .from(llmCategoryAnswers)
    .where(
      and(
        eq(llmCategoryAnswers.promptName, prompt.name),
        eq(llmCategoryAnswers.promptVersion, prompt.version),
        or(...textsGoingTheirWay(texts)),
      ),
    );
};

/**
 * Keeps a prompt's answers for every user, linked to none (8.5a). A text
 * the cache has for that version keeps its first answer.
 */
export const cacheLlmCategories = async (
  { tx }: UserContext,
  prompt: LlmPromptVersion,
  answers: readonly CachedLlmCategory[],
): Promise<void> => {
  if (answers.length === 0) return;
  await tx
    .insert(llmCategoryAnswers)
    .values(
      answers.map((answer) => ({
        promptName: prompt.name,
        promptVersion: prompt.version,
        ...answer,
      })),
    )
    .onConflictDoNothing({
      target: [
        llmCategoryAnswers.promptName,
        llmCategoryAnswers.promptVersion,
        llmCategoryAnswers.direction,
        llmCategoryAnswers.redactedText,
      ],
    });
};
