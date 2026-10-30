import type { AiAttempt } from "@/lib/ai";

// A call to DeepSeek as Langfuse's OpenTelemetry endpoint reads it, in OTLP's
// JSON (ADR 0032). This is the allowlist: an attribute leaves only if it's
// written here, and none holds what a prompt asked or a model answered.

/** Where a trace comes from, which Langfuse lets filter by. */
export type LangfuseEnvironment = "production" | "development";

export type LangfuseCall = {
  readonly prompt: { readonly name: string; readonly version: number };
  readonly environment: LangfuseEnvironment;
  /** 32 hex digits, as OpenTelemetry's trace ids. */
  readonly traceId: string;
  /** The call's span: 16 hex digits. */
  readonly spanId: string;
  /** Each attempt with its own span id; at least one. */
  readonly attempts: readonly (AiAttempt & { readonly spanId: string })[];
};

type Attribute = {
  readonly key: string;
  readonly value: { readonly stringValue: string };
};

type Span = {
  readonly traceId: string;
  readonly spanId: string;
  /** The call's span, for an attempt's. */
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: number;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly attributes: readonly Attribute[];
  readonly status: { readonly code: number };
};

// OTLP's span kind "internal", and its status codes.
const INTERNAL = 1;
const STATUS_OK = 1;
const STATUS_ERROR = 2;

const attribute = (key: string, value: string): Attribute => ({
  key,
  value: { stringValue: value },
});

const nanos = (milliseconds: number): string => `${milliseconds}000000`;

const traceName = ({ name, version }: LangfuseCall["prompt"]): string =>
  `${name}.v${version}`;

// On every span: Langfuse's v4 ingestion reads trace-level fields from each.
const traceAttributes = (call: LangfuseCall): Attribute[] => [
  attribute("langfuse.environment", call.environment),
  attribute("langfuse.trace.name", traceName(call.prompt)),
  attribute("langfuse.trace.metadata.prompt_name", call.prompt.name),
  attribute("langfuse.trace.metadata.prompt_version", `${call.prompt.version}`),
];

const usageAttributes = ({ usage }: AiAttempt): Attribute[] =>
  usage === undefined
    ? []
    : [
        attribute(
          "langfuse.observation.usage_details",
          JSON.stringify({
            input: usage.inputTokens,
            output: usage.outputTokens,
          }),
        ),
        attribute(
          "langfuse.observation.cost_details",
          JSON.stringify({ total: usage.costMicroUsd / 1e6 }),
        ),
      ];

const failureAttributes = ({ outcome, status }: AiAttempt): Attribute[] =>
  outcome === "OK"
    ? []
    : [
        attribute("langfuse.observation.level", "ERROR"),
        attribute(
          "langfuse.observation.status_message",
          status === undefined ? outcome : `${outcome} ${status}`,
        ),
      ];

const generationAttributes = (attempt: AiAttempt): Attribute[] => [
  attribute("langfuse.observation.type", "generation"),
  attribute("langfuse.observation.model.name", attempt.model),
  attribute("langfuse.observation.metadata.outcome", attempt.outcome),
  ...usageAttributes(attempt),
  ...failureAttributes(attempt),
];

/**
 * The call as OTLP's JSON: a span for the call, named after its prompt and
 * version ("categorize.v1"), and a generation under it for each attempt,
 * with its model, outcome, tokens, cost and times.
 */
export const langfuseTraces = (call: LangfuseCall) => {
  const shared = traceAttributes(call);
  const isAnswered = call.attempts.some(({ outcome }) => outcome === "OK");
  const root: Span = {
    traceId: call.traceId,
    spanId: call.spanId,
    name: traceName(call.prompt),
    kind: INTERNAL,
    startTimeUnixNano: nanos(
      Math.min(...call.attempts.map((a) => a.startedAt)),
    ),
    endTimeUnixNano: nanos(Math.max(...call.attempts.map((a) => a.endedAt))),
    attributes: shared,
    status: { code: isAnswered ? STATUS_OK : STATUS_ERROR },
  };
  const generations = call.attempts.map((attempt): Span => ({
    traceId: call.traceId,
    spanId: attempt.spanId,
    parentSpanId: call.spanId,
    name: attempt.model,
    kind: INTERNAL,
    startTimeUnixNano: nanos(attempt.startedAt),
    endTimeUnixNano: nanos(attempt.endedAt),
    attributes: [...shared, ...generationAttributes(attempt)],
    status: { code: attempt.outcome === "OK" ? STATUS_OK : STATUS_ERROR },
  }));
  return {
    resourceSpans: [
      {
        resource: { attributes: [attribute("service.name", "xtrakto")] },
        scopeSpans: [
          { scope: { name: "xtrakto/lib/ai" }, spans: [root, ...generations] },
        ],
      },
    ],
  };
};
