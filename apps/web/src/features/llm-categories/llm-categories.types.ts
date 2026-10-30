import type { CategoryId, MoneyDirection } from "@xtrakto/core";
import type { LlmText } from "@xtrakto/db";
import type { AiError, AiModelId } from "@/lib/ai";

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
  /** The model that answered. */
  readonly model: AiModelId;
  /** What was paid, in plain words; `null` when the model's wasn't plain (8.6b). */
  readonly title: string | null;
};

/** The answers, by each text's position, and why the batches stopped early, if they did. */
export type CategorizedTexts = {
  readonly answers: ReadonlyMap<number, LlmCategoryAnswer>;
  readonly stoppedBy?: AiError;
};

/** A text as the LLM reads it, with the bank's texts of the user's it stands for. */
export type LlmTextGroup = LlmText & {
  readonly descriptions: readonly string[];
};

/**
 * What a round of the LLM's categories did, in counts and codes only, since
 * Inngest keeps a step's output (ADR 0019).
 */
export type LlmRound = {
  /** Movements given an answer the cache had. */
  readonly fromCache: number;
  /** Texts sent to the LLM. */
  readonly asked: number;
  /** Of those, the ones it answered. */
  readonly answered: number;
  /** Movements given a new answer, from the confidence threshold. */
  readonly categorized: number;
  /** Texts still to send, for another round. */
  readonly hasMore: boolean;
  /** Why the LLM wasn't asked, or stopped. */
  readonly stoppedBy?: AiError["code"];
};
