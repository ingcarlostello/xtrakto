import { describe, expect, it } from "vitest";
import { type LangfuseCall, langfuseTraces } from "./langfuse-trace.helpers";

const CALL: LangfuseCall = {
  prompt: { name: "categorize", version: 2 },
  environment: "production",
  traceId: "0123456789abcdef0123456789abcdef",
  spanId: "1111111111111111",
  attempts: [
    {
      spanId: "2222222222222222",
      model: "deepseek-flash",
      outcome: "PROVIDER_ERROR",
      status: 503,
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_000_400,
    },
    {
      spanId: "3333333333333333",
      model: "deepseek-v4-pro",
      outcome: "OK",
      startedAt: 1_700_000_000_400,
      endedAt: 1_700_000_001_500,
      usage: { inputTokens: 40, outputTokens: 12, costMicroUsd: 101 },
    },
  ],
};

const spansOf = (call: LangfuseCall) =>
  langfuseTraces(call).resourceSpans[0]?.scopeSpans[0]?.spans ?? [];

const attributesOf = (
  span: ReturnType<typeof spansOf>[number] | undefined,
): Record<string, string> =>
  Object.fromEntries(
    (span?.attributes ?? []).map(({ key, value }) => [key, value.stringValue]),
  );

describe("langfuseTraces", () => {
  it("sends only the attributes it allows, never a prompt or an answer", () => {
    const traces = langfuseTraces(CALL);
    const keys = new Set(
      [
        ...(traces.resourceSpans[0]?.resource.attributes ?? []),
        ...spansOf(CALL).flatMap(({ attributes }) => attributes),
      ].map(({ key }) => key),
    );

    expect([...keys].sort()).toEqual([
      "langfuse.environment",
      "langfuse.observation.cost_details",
      "langfuse.observation.level",
      "langfuse.observation.metadata.outcome",
      "langfuse.observation.model.name",
      "langfuse.observation.status_message",
      "langfuse.observation.type",
      "langfuse.observation.usage_details",
      "langfuse.trace.metadata.prompt_name",
      "langfuse.trace.metadata.prompt_version",
      "langfuse.trace.name",
      "service.name",
    ]);
  });

  it("names the call after its prompt and version, in its environment", () => {
    const [call] = spansOf(CALL);

    expect(call?.name).toBe("categorize.v2");
    expect(attributesOf(call)).toEqual({
      "langfuse.environment": "production",
      "langfuse.trace.name": "categorize.v2",
      "langfuse.trace.metadata.prompt_name": "categorize",
      "langfuse.trace.metadata.prompt_version": "2",
    });
  });

  it("spans the call from its first attempt's start to its last's end, in nanoseconds", () => {
    const [call] = spansOf(CALL);

    expect(call?.startTimeUnixNano).toBe("1700000000000000000");
    expect(call?.endTimeUnixNano).toBe("1700000001500000000");
  });

  it("puts each attempt under the call, as a generation of its model", () => {
    const [call, ...generations] = spansOf(CALL);

    expect(
      generations.map(({ traceId, spanId, parentSpanId, name }) => ({
        traceId,
        spanId,
        parentSpanId,
        name,
      })),
    ).toEqual([
      {
        traceId: CALL.traceId,
        spanId: "2222222222222222",
        parentSpanId: call?.spanId,
        name: "deepseek-flash",
      },
      {
        traceId: CALL.traceId,
        spanId: "3333333333333333",
        parentSpanId: call?.spanId,
        name: "deepseek-v4-pro",
      },
    ]);
    expect(call?.traceId).toBe(CALL.traceId);
  });

  it("gives an answered attempt its tokens, its cost in dollars and its times", () => {
    const answered = spansOf(CALL)[2];

    expect(attributesOf(answered)).toMatchObject({
      "langfuse.observation.type": "generation",
      "langfuse.observation.model.name": "deepseek-v4-pro",
      "langfuse.observation.metadata.outcome": "OK",
      "langfuse.observation.usage_details": '{"input":40,"output":12}',
      "langfuse.observation.cost_details": '{"total":0.000101}',
    });
    expect(attributesOf(answered)).not.toHaveProperty(
      "langfuse.observation.level",
    );
    expect(answered?.startTimeUnixNano).toBe("1700000000400000000");
    expect(answered?.endTimeUnixNano).toBe("1700000001500000000");
    expect(answered?.status).toEqual({ code: 1 });
  });

  it("marks a failed attempt as an error with its code and status", () => {
    const failed = spansOf(CALL)[1];

    expect(attributesOf(failed)).toMatchObject({
      "langfuse.observation.metadata.outcome": "PROVIDER_ERROR",
      "langfuse.observation.level": "ERROR",
      "langfuse.observation.status_message": "PROVIDER_ERROR 503",
    });
    expect(attributesOf(failed)).not.toHaveProperty(
      "langfuse.observation.usage_details",
    );
    expect(failed?.status).toEqual({ code: 2 });
  });

  it("ends in error a call no attempt answered, a failure without status by its code", () => {
    const [call, failed] = spansOf({
      ...CALL,
      environment: "development",
      attempts: [
        {
          spanId: "4444444444444444",
          model: "deepseek-flash",
          outcome: "TIMEOUT",
          startedAt: 1_700_000_000_000,
          endedAt: 1_700_000_020_000,
        },
      ],
    });

    expect(call?.status).toEqual({ code: 2 });
    expect(attributesOf(call)["langfuse.environment"]).toBe("development");
    expect(attributesOf(failed)["langfuse.observation.status_message"]).toBe(
      "TIMEOUT",
    );
  });
});
