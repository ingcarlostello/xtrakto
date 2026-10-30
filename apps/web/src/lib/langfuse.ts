import "server-only";
import { randomBytes } from "node:crypto";
import { captureException } from "@sentry/nextjs";
import {
  type LangfuseEnvironment,
  langfuseTraces,
} from "@/utils/langfuse-trace.helpers";
import { sanitizedError } from "@/utils/sanitized-error.utils";
import type { AiCallRecord } from "./ai";
import { getAiEnv } from "./env";

// Langfuse Cloud's US region, through its OpenTelemetry endpoint, which takes
// OTLP's JSON: no SDK, so every attribute that leaves is written by
// utils/langfuse-trace.helpers.ts (ADR 0032).
const TRACES_URL = "https://us.cloud.langfuse.com/api/public/otel/v1/traces";
const EXPORT_TIMEOUT_MS = 3_000;

const hexId = (bytes: number): string => randomBytes(bytes).toString("hex");

const send = async (call: AiCallRecord, keys: readonly [string, string]) => {
  const environment: LangfuseEnvironment =
    getAiEnv().VERCEL_ENV === "production" ? "production" : "development";
  const body = langfuseTraces({
    prompt: call.prompt,
    environment,
    traceId: hexId(16),
    spanId: hexId(8),
    attempts: call.attempts.map((attempt) => ({
      ...attempt,
      spanId: hexId(8),
    })),
  });
  const response = await fetch(TRACES_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(keys.join(":")).toString("base64")}`,
      "Content-Type": "application/json",
      // Langfuse's current ingestion; without it, a trace waits up to 10 minutes.
      "x-langfuse-ingestion-version": "4",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(EXPORT_TIMEOUT_MS),
  });
  if (!response.ok)
    captureException(new Error(`Langfuse refused a trace: ${response.status}`));
};

/**
 * Records a call to DeepSeek in Langfuse: a trace for the call and a
 * generation for each attempt. Off without Langfuse's keys, as in CI. A
 * failed export reaches Sentry as a code and never fails the call.
 */
export const recordAiCall = async (call: AiCallRecord): Promise<void> => {
  const { LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } = getAiEnv();
  if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) return;
  try {
    await send(call, [LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY]);
  } catch (error) {
    captureException(sanitizedError("Langfuse export failed", error));
  }
};
