import "server-only";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { err, ok, type Result } from "@xtrakto/core";
import {
  APICallError,
  generateText,
  type LanguageModelUsage,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from "ai";
import type { z } from "zod";
import { getAiEnv } from "./env";
import { recordAiCall } from "./langfuse";

// The only module that calls an LLM (project rules §14). It goes to
// DeepSeek's own API (ADR 0031) through its AI SDK package: a bare model id
// would go through Vercel's AI Gateway instead.

/** The models a call tries, in order: the second is the first's fallback. */
export const AI_MODELS = ["deepseek-flash", "deepseek-v4-pro"] as const;

export type AiModelId = (typeof AI_MODELS)[number];

// DeepSeek's prices in millionths of a dollar per million tokens, at its peak
// hours and without its cache's discount (api-docs.deepseek.com, October
// 2026), so a call's cost is an upper bound.
const PRICES: Readonly<
  Record<AiModelId, { readonly input: number; readonly output: number }>
> = {
  "deepseek-flash": { input: 300_000, output: 1_200_000 },
  "deepseek-v4-pro": { input: 1_320_000, output: 3_960_000 },
};

// Two attempts fit in the Inngest route's 60 seconds (app/api/inngest/route.ts),
// with room for the step's own reads and writes.
const ATTEMPT_TIMEOUT_MS = 20_000;

// How an aborted fetch names itself: `timeout` aborts with a TimeoutError.
const TIMEOUT_NAMES = new Set(["TimeoutError", "AbortError"]);

/**
 * A versioned prompt, the only way to ask DeepSeek something: a file of its
 * feature's `prompts/` folder named `<name>.v<version>.ts` (project rules
 * §14). A change to what it asks or how it answers is a new version.
 */
export type AiPrompt<T> = {
  readonly name: string;
  readonly version: number;
  /** What the model has to do. */
  readonly instructions: string;
  /** The answer's shape, which DeepSeek gets with the instructions. */
  readonly schema: z.ZodType<T>;
  readonly maxOutputTokens: number;
};

export type AiFailureReason = "TIMEOUT" | "INVALID_OUTPUT" | "PROVIDER_ERROR";

/**
 * Why an attempt failed, as codes only. The SDK's errors carry content: an
 * API error keeps the request's body, the prompt included, and an answer the
 * schema rejects keeps its text. Inngest, logs and Sentry keep what reaches
 * them (ADR 0019), so none of it leaves this module.
 */
export type AiAttemptFailure = {
  readonly model: AiModelId;
  readonly reason: AiFailureReason;
  /** The HTTP status DeepSeek answered with, when it answered. */
  readonly status?: number;
};

/** What an attempt used, when DeepSeek said. */
export type AiUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** Millionths of a dollar, at most (see PRICES). */
  readonly costMicroUsd: number;
};

/** One attempt, as its ledger and Langfuse record it: how and when it ended, and what it used. */
export type AiAttempt = {
  readonly model: AiModelId;
  readonly outcome: "OK" | AiFailureReason;
  readonly status?: number;
  /** Milliseconds since the epoch. */
  readonly startedAt: number;
  readonly endedAt: number;
  readonly usage?: AiUsage;
};

/** A call to DeepSeek: its prompt's name and version, and its attempts. */
export type AiCallRecord = {
  readonly prompt: Pick<AiPrompt<unknown>, "name" | "version">;
  readonly attempts: readonly AiAttempt[];
};

/** A limit that stops a call before it goes out (8.3). */
export type AiLimit = "USER_MONTH" | "PLATFORM_BUDGET";

/**
 * Who pays for a call: what stops it before it goes out, and where what it
 * used is saved after. Every call has one, so none skips the limits (project
 * rules §14); a user's lives in features/llm-usage.
 */
export type AiLedger = {
  /** The limit the call would pass, if any. */
  readonly check: () => Promise<AiLimit | undefined>;
  readonly record: (call: AiCallRecord) => Promise<void>;
};

export type AiError =
  /** Without DEEPSEEK_API_KEY, as in CI: no call leaves. */
  | { readonly code: "AI_OFF" }
  | { readonly code: "AI_LIMIT_REACHED"; readonly limit: AiLimit }
  | {
      readonly code: "AI_FAILED";
      readonly failures: readonly AiAttemptFailure[];
    };

/** What to ask, about what, who pays, and which models try, in order. */
export type StructuredCall<T> = {
  readonly prompt: AiPrompt<T>;
  readonly input: string;
  readonly ledger: AiLedger;
  /** AI_MODELS unless an eval asks one model alone (8.4). */
  readonly models?: readonly AiModelId[];
};

export type StructuredAnswer<T> = {
  readonly value: T;
  /** The model that answered. */
  readonly model: AiModelId;
};

type DeepSeek = ReturnType<typeof createDeepSeek>;
type Call<T> = { readonly prompt: AiPrompt<T>; readonly input: string };
type Attempted<T> =
  | { readonly ok: true; readonly value: T; readonly attempt: AiAttempt }
  | { readonly ok: false; readonly attempt: AiAttempt };

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

const failureOf = (error: unknown): Omit<AiAttemptFailure, "model"> => {
  const name = nameOf(error);
  if (name !== undefined && TIMEOUT_NAMES.has(name))
    return { reason: "TIMEOUT" };
  if (isInvalidOutput(error)) return { reason: "INVALID_OUTPUT" };
  if (APICallError.isInstance(error) && error.statusCode !== undefined)
    return { reason: "PROVIDER_ERROR", status: error.statusCode };
  return { reason: "PROVIDER_ERROR" };
};

const usageOf = (
  model: AiModelId,
  usage: LanguageModelUsage | undefined,
): AiUsage | undefined => {
  const { inputTokens, outputTokens } = usage ?? {};
  if (inputTokens === undefined || outputTokens === undefined) return undefined;
  const price = PRICES[model];
  const cost = inputTokens * price.input + outputTokens * price.output;
  return { inputTokens, outputTokens, costMicroUsd: Math.ceil(cost / 1e6) };
};

const generate = <T>(deepSeek: DeepSeek, model: AiModelId, call: Call<T>) =>
  generateText({
    model: deepSeek(model),
    instructions: call.prompt.instructions,
    prompt: call.input,
    output: Output.object({ schema: call.prompt.schema }),
    maxOutputTokens: call.prompt.maxOutputTokens,
    // A text to classify or title gets the same answer each time, which the
    // evals and the answers' cache count on (8.4).
    temperature: 0,
    // DeepSeek's V4 models think before answering unless told not to. Short
    // texts to classify or title don't need it; it would spend the time.
    reasoning: "none",
    // The fallback model is the retry.
    maxRetries: 0,
    timeout: ATTEMPT_TIMEOUT_MS,
    // The SDK's own telemetry would hand the prompt to whoever listens, as
    // Sentry's AI integration does: Langfuse gets each attempt by hand,
    // through an allowlist (ADR 0032).
    telemetry: { isEnabled: false },
  });

const attempt = async <T>(
  deepSeek: DeepSeek,
  model: AiModelId,
  call: Call<T>,
): Promise<Attempted<T>> => {
  const startedAt = Date.now();
  try {
    const result = await generate(deepSeek, model, call);
    const usage = usageOf(model, result.usage);
    const value = result.output;
    const ended = { model, startedAt, endedAt: Date.now(), usage };
    return { ok: true, value, attempt: { ...ended, outcome: "OK" } };
  } catch (error) {
    const { reason, status } = failureOf(error);
    // An answer the schema rejects was paid for all the same.
    const spent = NoObjectGeneratedError.isInstance(error)
      ? error.usage
      : undefined;
    const ended = { model, startedAt, endedAt: Date.now() };
    const usage = usageOf(model, spent);
    return { ok: false, attempt: { ...ended, outcome: reason, status, usage } };
  }
};

const failuresOf = (attempts: readonly AiAttempt[]): AiAttemptFailure[] =>
  attempts.flatMap(({ model, outcome, status }) =>
    outcome === "OK" ? [] : [{ model, reason: outcome, status }],
  );

const deepSeekProvider = (): DeepSeek | undefined => {
  const apiKey = getAiEnv().DEEPSEEK_API_KEY;
  return apiKey === undefined ? undefined : createDeepSeek({ apiKey });
};

/**
 * Asks DeepSeek what `prompt` asks about `input`, for an answer its schema
 * passes, unless one of the ledger's limits stops it: the first model, then
 * once the fallback when the first fails, takes too long or answers what the
 * schema rejects. The ledger and Langfuse (lib/langfuse.ts) record every
 * attempt. Every failure comes back as a value, so a caller lets its
 * movements wait (system design §1); none carries content.
 */
export const generateStructured = async <T>({
  prompt,
  input,
  ledger,
  models = AI_MODELS,
}: StructuredCall<T>): Promise<Result<StructuredAnswer<T>, AiError>> => {
  const deepSeek = deepSeekProvider();
  if (deepSeek === undefined) return err({ code: "AI_OFF" });
  const limit = await ledger.check();
  if (limit !== undefined) return err({ code: "AI_LIMIT_REACHED", limit });
  const attempts: AiAttempt[] = [];
  const record = async () => {
    const call = {
      prompt: { name: prompt.name, version: prompt.version },
      attempts,
    };
    await ledger.record(call);
    await recordAiCall(call);
  };
  for (const model of models) {
    const result = await attempt(deepSeek, model, { prompt, input });
    attempts.push(result.attempt);
    if (result.ok) {
      await record();
      return ok({ value: result.value, model });
    }
  }
  await record();
  return err({ code: "AI_FAILED", failures: failuresOf(attempts) });
};
