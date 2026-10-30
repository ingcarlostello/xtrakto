import "server-only";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { err, ok, type Result } from "@xtrakto/core";
import {
  APICallError,
  generateText,
  type LanguageModel,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from "ai";
import type { z } from "zod";
import { getServerEnv } from "./env";

// The only module that calls an LLM (project rules §14). It goes to
// DeepSeek's own API (ADR 0031) through its AI SDK package: a bare model id
// would go through Vercel's AI Gateway instead.

/** The models a call tries, in order: the second is the first's fallback. */
export const AI_MODELS = ["deepseek-flash", "deepseek-v4-pro"] as const;

export type AiModelId = (typeof AI_MODELS)[number];

// Two attempts fit in the Inngest route's 60 seconds (app/api/inngest/route.ts),
// with room for the step's own reads and writes.
const ATTEMPT_TIMEOUT_MS = 20_000;

// How an aborted fetch names itself: `timeout` aborts with a TimeoutError.
const TIMEOUT_NAMES = new Set(["TimeoutError", "AbortError"]);

/**
 * Why an attempt failed, as codes only. The SDK's errors carry content: an
 * API error keeps the request's body, the prompt included, and an answer the
 * schema rejects keeps its text. Inngest, logs and Sentry keep what reaches
 * them (ADR 0019), so none of it leaves this module.
 */
export type AiAttemptFailure = {
  readonly model: AiModelId;
  readonly reason: "TIMEOUT" | "INVALID_OUTPUT" | "PROVIDER_ERROR";
  /** The HTTP status DeepSeek answered with, when it answered. */
  readonly status?: number;
};

export type AiError =
  /** Without DEEPSEEK_API_KEY, as in CI: no call leaves. */
  | { readonly code: "AI_OFF" }
  | {
      readonly code: "AI_FAILED";
      readonly failures: readonly AiAttemptFailure[];
    };

/** A call whose answer must pass `schema`. */
export type StructuredRequest<T> = {
  /** What the model has to do. */
  readonly instructions: string;
  /** What it works on. */
  readonly input: string;
  readonly schema: z.ZodType<T>;
  readonly maxOutputTokens: number;
};

export type StructuredAnswer<T> = {
  readonly value: T;
  /** The model that answered. */
  readonly model: AiModelId;
};

const nameOf = (error: unknown): string | undefined =>
  error instanceof Error || error instanceof DOMException
    ? error.name
    : undefined;

// The SDK wraps an answer that isn't JSON or that the schema rejects in a
// NoObjectGeneratedError; one that ends before any text, in a
// NoOutputGeneratedError.
const isInvalidOutput = (error: unknown): boolean =>
  NoObjectGeneratedError.isInstance(error) ||
  NoOutputGeneratedError.isInstance(error);

const failureOf = (model: AiModelId, error: unknown): AiAttemptFailure => {
  const name = nameOf(error);
  if (name !== undefined && TIMEOUT_NAMES.has(name))
    return { model, reason: "TIMEOUT" };
  if (isInvalidOutput(error)) return { model, reason: "INVALID_OUTPUT" };
  if (APICallError.isInstance(error) && error.statusCode !== undefined)
    return { model, reason: "PROVIDER_ERROR", status: error.statusCode };
  return { model, reason: "PROVIDER_ERROR" };
};

const answerOf = async <T>(
  model: LanguageModel,
  request: StructuredRequest<T>,
): Promise<T> => {
  const { output } = await generateText({
    model,
    instructions: request.instructions,
    prompt: request.input,
    output: Output.object({ schema: request.schema }),
    maxOutputTokens: request.maxOutputTokens,
    // DeepSeek's V4 models think before answering unless told not to. Short
    // texts to classify or title don't need it; it would spend the time.
    reasoning: "none",
    // The fallback model is the retry.
    maxRetries: 0,
    timeout: ATTEMPT_TIMEOUT_MS,
  });
  return output;
};

const deepSeek = () => {
  const apiKey = getServerEnv().DEEPSEEK_API_KEY;
  return apiKey === undefined ? undefined : createDeepSeek({ apiKey });
};

/**
 * Asks DeepSeek for an answer that passes `request.schema`: its first model,
 * then once the fallback when the first fails, takes too long or answers
 * what the schema rejects. Every failure comes back as a value, so a caller
 * lets its movements wait (system design §1); none carries content.
 */
export const generateStructured = async <T>(
  request: StructuredRequest<T>,
): Promise<Result<StructuredAnswer<T>, AiError>> => {
  const provider = deepSeek();
  if (provider === undefined) return err({ code: "AI_OFF" });
  const failures: AiAttemptFailure[] = [];
  for (const model of AI_MODELS) {
    try {
      return ok({ value: await answerOf(provider(model), request), model });
    } catch (error) {
      failures.push(failureOf(model, error));
    }
  }
  return err({ code: "AI_FAILED", failures });
};
