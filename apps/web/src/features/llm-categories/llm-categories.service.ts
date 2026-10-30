import "server-only";
import { type AiLedger, type AiModelId, generateStructured } from "@/lib/ai";
import { CATEGORIZE_BATCH_SIZE } from "./llm-categories.constants";
import {
  answersOf,
  batchesOf,
  categorizeInput,
} from "./llm-categories.helpers";
import type {
  CategorizedTexts,
  LlmCategoryAnswer,
  TextToCategorize,
} from "./llm-categories.types";
import { CATEGORIZE_V1 } from "./prompts/categorize.v1";

export type CategorizeTextsCall = {
  /** Distinct texts, each redacted with its holder's names. */
  readonly texts: readonly TextToCategorize[];
  readonly ledger: AiLedger;
  /** lib/ai's models unless an eval asks one alone. */
  readonly models?: readonly AiModelId[];
};

/**
 * Asks the LLM the category of each text, in batches (8.4). The first
 * failure or limit stops the batches: the texts without an answer wait for
 * the next run (system design §1).
 */
export const categorizeTexts = async ({
  texts,
  ledger,
  models,
}: CategorizeTextsCall): Promise<CategorizedTexts> => {
  const answers = new Map<number, LlmCategoryAnswer>();
  for (const batch of batchesOf(texts, CATEGORIZE_BATCH_SIZE)) {
    const result = await generateStructured({
      prompt: CATEGORIZE_V1,
      input: categorizeInput(batch.items),
      ledger,
      models,
    });
    if (!result.ok) return { answers, stoppedBy: result.error };
    for (const [index, answer] of answersOf(batch.items, result.value.value))
      answers.set(batch.start + index, answer);
  }
  return { answers };
};
