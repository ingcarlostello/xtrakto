import type { CategoryId, MoneyDirection } from "@xtrakto/core";

/** A prompt's name and version, which key its answers. */
export type LlmPromptVersion = {
  readonly name: string;
  readonly version: number;
};

/** A text as the LLM read it: redacted, with its money's direction. */
export type LlmText = {
  readonly redactedText: string;
  readonly direction: MoneyDirection;
};

/** What the LLM answered for a text, as the cache keeps it. */
export type CachedLlmCategory = LlmText & {
  readonly categoryId: CategoryId;
  /** From 0 to 1. */
  readonly confidence: number;
  /** The model that answered. */
  readonly model: string;
  /** What was paid, in plain words, when the prompt's version asks it (8.6b). */
  readonly title: string | null;
};

/** A text of the user's movements that waits for the LLM, as the bank wrote it. */
export type LlmWaitingText = {
  readonly descriptionNormalized: string;
  readonly direction: MoneyDirection;
};

/** The category the LLM gave a text, for each of the user's movements with it. */
export type LlmMovementCategory = LlmWaitingText & {
  readonly categoryId: CategoryId;
  /** What was paid, in plain words, when the LLM said it (8.6b). */
  readonly title: string | null;
};
