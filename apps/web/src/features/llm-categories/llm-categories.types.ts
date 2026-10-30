import type { CategoryId, MoneyDirection } from "@xtrakto/core";
import type { AiError } from "@/lib/ai";

/** A bank's text for the LLM, redacted with the holder's names, and which way its money goes. */
export type TextToCategorize = {
  readonly text: string;
  readonly direction: MoneyDirection;
};

/** What the LLM said about one text. */
export type LlmCategoryAnswer = {
  readonly categoryId: CategoryId;
  /** From 0 to 1. */
  readonly confidence: number;
};

/** The answers, by each text's position, and why the batches stopped early, if they did. */
export type CategorizedTexts = {
  readonly answers: ReadonlyMap<number, LlmCategoryAnswer>;
  readonly stoppedBy?: AiError;
};
