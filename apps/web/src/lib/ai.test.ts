import { tracingChannel } from "node:diagnostics_channel";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type AiCallRecord, type AiLimit, generateStructured } from "./ai";

// DeepSeek's models are replaced by the AI SDK's mock models, one per model
// id. The SDK itself runs, so its parsing, validation and errors are real.
const mocks = vi.hoisted(() => ({
  apiKey: undefined as string | undefined,
  createDeepSeek: vi.fn(),
  models: new Map<string, MockLanguageModelV4>(),
  recordAiCall: vi.fn<(call: AiCallRecord) => Promise<void>>(),
  check: vi.fn<() => Promise<AiLimit | undefined>>(),
  spend: vi.fn<(call: AiCallRecord) => Promise<void>>(),
}));

// Whoever pays for the call: no limit stops it unless a test says so.
const LEDGER = { check: mocks.check, record: mocks.spend };

vi.mock("./env", () => ({
  getServerEnv: () => ({ DEEPSEEK_API_KEY: mocks.apiKey }),
}));
vi.mock("./langfuse", () => ({ recordAiCall: mocks.recordAiCall }));
vi.mock("@ai-sdk/deepseek", () => ({ createDeepSeek: mocks.createDeepSeek }));

const API_KEY = "test-deepseek-key";
const INPUT = "COMPRA EN SUPERMERCADO VECI";
const PROMPT = {
  name: "check",
  version: 1,
  instructions: "Clasifica el movimiento.",
  schema: z.object({
    category: z.enum(["groceries", "restaurants"]),
    confidence: z.number().min(0).max(1),
  }),
  maxOutputTokens: 200,
};
const ANSWER = '{"category":"groceries","confidence":0.9}';
const USAGE = {
  inputTokens: { total: 40, noCache: 40, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 12, text: 12, reasoning: 0 },
};

const answering = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: USAGE,
      warnings: [],
    }),
  });

// The output limit cut the answer before any text.
const cutShort = () =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [],
      finishReason: { unified: "length", raw: "length" },
      usage: USAGE,
      warnings: [],
    }),
  });

const throwing = (error: unknown) =>
  new MockLanguageModelV4({
    doGenerate: async () => {
      throw error;
    },
  });

const apiError = (statusCode: number) =>
  new APICallError({
    message: "DeepSeek answered with an error.",
    url: "https://api.deepseek.com/chat/completions",
    requestBodyValues: { messages: [{ role: "user", content: INPUT }] },
    statusCode,
    responseBody: `{"error":"${INPUT}"}`,
    isRetryable: statusCode >= 500,
  });

const timeout = () =>
  new DOMException("Request timeout of 20000ms exceeded", "TimeoutError");

const useModels = (flash: MockLanguageModelV4, pro: MockLanguageModelV4) => {
  mocks.models.set("deepseek-flash", flash);
  mocks.models.set("deepseek-v4-pro", pro);
  return { flash, pro };
};

// lib/ai's only record of the call, as Langfuse would get it.
const recorded = (): AiCallRecord => {
  expect(mocks.recordAiCall).toHaveBeenCalledOnce();
  const record = mocks.recordAiCall.mock.calls[0]?.[0];
  if (record === undefined) throw new Error("Nothing was recorded.");
  return record;
};

beforeEach(() => {
  mocks.apiKey = API_KEY;
  mocks.models.clear();
  mocks.createDeepSeek.mockReset();
  mocks.createDeepSeek.mockImplementation(
    () => (modelId: string) => mocks.models.get(modelId),
  );
  mocks.recordAiCall.mockReset();
  mocks.recordAiCall.mockResolvedValue(undefined);
  mocks.check.mockReset();
  mocks.check.mockResolvedValue(undefined);
  mocks.spend.mockReset();
  mocks.spend.mockResolvedValue(undefined);
});

describe("generateStructured", () => {
  it("makes no call without DeepSeek's key, as in CI", async () => {
    mocks.apiKey = undefined;

    expect(await generateStructured(PROMPT, INPUT, LEDGER)).toEqual({
      ok: false,
      error: { code: "AI_OFF" },
    });
    expect(mocks.createDeepSeek).not.toHaveBeenCalled();
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.recordAiCall).not.toHaveBeenCalled();
  });

  it.each(["USER_MONTH", "PLATFORM_BUDGET"] as const)(
    "asks DeepSeek nothing when its ledger's %s limit stops the call",
    async (limit) => {
      const { flash } = useModels(answering(ANSWER), answering(ANSWER));
      mocks.check.mockResolvedValue(limit);

      expect(await generateStructured(PROMPT, INPUT, LEDGER)).toEqual({
        ok: false,
        error: { code: "AI_LIMIT_REACHED", limit },
      });
      expect(flash.doGenerateCalls).toHaveLength(0);
      expect(mocks.spend).not.toHaveBeenCalled();
      expect(mocks.recordAiCall).not.toHaveBeenCalled();
    },
  );

  it("answers with the first model, as the schema reads it", async () => {
    const { pro } = useModels(answering(ANSWER), answering(ANSWER));

    expect(await generateStructured(PROMPT, INPUT, LEDGER)).toEqual({
      ok: true,
      value: {
        value: { category: "groceries", confidence: 0.9 },
        model: "deepseek-flash",
      },
    });
    expect(mocks.createDeepSeek).toHaveBeenCalledWith({ apiKey: API_KEY });
    expect(pro.doGenerateCalls).toHaveLength(0);
  });

  it("asks for JSON, without thinking and with a time limit", async () => {
    const { flash } = useModels(answering(ANSWER), answering(ANSWER));

    await generateStructured(PROMPT, INPUT, LEDGER);

    const [call] = flash.doGenerateCalls;
    expect(call?.responseFormat?.type).toBe("json");
    expect(call?.reasoning).toBe("none");
    expect(call?.maxOutputTokens).toBe(200);
    expect(call?.abortSignal).toBeInstanceOf(AbortSignal);
    expect(call?.prompt).toEqual([
      { role: "system", content: PROMPT.instructions },
      { role: "user", content: [{ type: "text", text: INPUT }] },
    ]);
  });

  it("keeps the SDK's own telemetry off, so no tracing channel hears a call", async () => {
    useModels(answering(ANSWER), answering(ANSWER));
    const heard: string[] = [];
    const listener = {
      start: () => heard.push("start"),
      end: () => heard.push("end"),
      asyncStart: () => heard.push("asyncStart"),
      asyncEnd: () => heard.push("asyncEnd"),
      error: () => heard.push("error"),
    };
    const channel = tracingChannel("ai:telemetry");
    channel.subscribe(listener);
    try {
      await generateStructured(PROMPT, INPUT, LEDGER);
    } finally {
      channel.unsubscribe(listener);
    }

    expect(heard).toEqual([]);
  });

  it.each([
    {
      failure: "an error DeepSeek would retry",
      model: throwing(apiError(503)),
    },
    { failure: "a timeout", model: throwing(timeout()) },
    {
      failure: "an answer the schema rejects",
      model: answering('{"category":"travel","confidence":2}'),
    },
    { failure: "an answer that isn't JSON", model: answering("Mercado.") },
    { failure: "an answer cut before any text", model: cutShort() },
  ])("falls back to the second model once after $failure", async (row) => {
    const { flash } = useModels(row.model, answering(ANSWER));

    const result = await generateStructured(PROMPT, INPUT, LEDGER);

    expect(result.ok && result.value.model).toBe("deepseek-v4-pro");
    expect(flash.doGenerateCalls).toHaveLength(1);
  });

  it("fails with a code for each model when both fail", async () => {
    useModels(throwing(apiError(402)), answering("Mercado."));

    expect(await generateStructured(PROMPT, INPUT, LEDGER)).toEqual({
      ok: false,
      error: {
        code: "AI_FAILED",
        failures: [
          { model: "deepseek-flash", reason: "PROVIDER_ERROR", status: 402 },
          { model: "deepseek-v4-pro", reason: "INVALID_OUTPUT" },
        ],
      },
    });
  });

  it("counts an answer cut before any text as one the schema can't read", async () => {
    useModels(cutShort(), cutShort());

    const result = await generateStructured(PROMPT, INPUT, LEDGER);

    expect(!result.ok && result.error).toEqual({
      code: "AI_FAILED",
      failures: [
        { model: "deepseek-flash", reason: "INVALID_OUTPUT" },
        { model: "deepseek-v4-pro", reason: "INVALID_OUTPUT" },
      ],
    });
  });

  it("tells a timeout from a network failure", async () => {
    useModels(throwing(timeout()), throwing(new TypeError("fetch failed")));

    const result = await generateStructured(PROMPT, INPUT, LEDGER);

    expect(!result.ok && result.error).toEqual({
      code: "AI_FAILED",
      failures: [
        { model: "deepseek-flash", reason: "TIMEOUT" },
        { model: "deepseek-v4-pro", reason: "PROVIDER_ERROR" },
      ],
    });
  });

  it("never carries the prompt or the model's answer in a failure", async () => {
    const answer = "VECI es un supermercado de barrio";
    useModels(throwing(apiError(400)), answering(answer));

    const failure = JSON.stringify(
      await generateStructured(PROMPT, INPUT, LEDGER),
    );

    expect(failure).not.toContain("VECI");
    expect(failure).not.toContain(PROMPT.instructions);
  });
});

describe("generateStructured's record for Langfuse", () => {
  it("hands its ledger the same record, once, after the call", async () => {
    useModels(throwing(apiError(503)), answering(ANSWER));

    await generateStructured(PROMPT, INPUT, LEDGER);

    expect(mocks.spend).toHaveBeenCalledOnce();
    expect(mocks.spend.mock.calls[0]?.[0]).toEqual(recorded());
  });

  it("records each attempt: its model, outcome, times and what it used", async () => {
    useModels(throwing(apiError(503)), answering(ANSWER));

    await generateStructured(PROMPT, INPUT, LEDGER);

    const { prompt, attempts } = recorded();
    expect(prompt).toEqual({ name: "check", version: 1 });
    const [failed, answered] = attempts;
    expect(failed).toEqual({
      model: "deepseek-flash",
      outcome: "PROVIDER_ERROR",
      status: 503,
      startedAt: expect.any(Number),
      endedAt: expect.any(Number),
    });
    // 40 tokens in and 12 out at deepseek-v4-pro's peak prices, rounded up.
    expect(answered).toEqual({
      model: "deepseek-v4-pro",
      outcome: "OK",
      startedAt: expect.any(Number),
      endedAt: expect.any(Number),
      usage: { inputTokens: 40, outputTokens: 12, costMicroUsd: 101 },
    });
    expect(answered?.endedAt).toBeGreaterThanOrEqual(failed?.startedAt ?? 0);
  });

  it("counts what an answer the schema rejects used, at deepseek-flash's prices", async () => {
    useModels(answering("Mercado."), answering(ANSWER));

    await generateStructured(PROMPT, INPUT, LEDGER);

    const [rejected] = recorded().attempts;
    expect(rejected?.outcome).toBe("INVALID_OUTPUT");
    expect(rejected?.usage).toEqual({
      inputTokens: 40,
      outputTokens: 12,
      costMicroUsd: 27,
    });
  });

  it("records a call that failed twice, once", async () => {
    useModels(throwing(timeout()), throwing(apiError(500)));

    await generateStructured(PROMPT, INPUT, LEDGER);

    expect(recorded().attempts.map(({ outcome }) => outcome)).toEqual([
      "TIMEOUT",
      "PROVIDER_ERROR",
    ]);
  });

  it("never hands Langfuse the instructions, the input or the answer", async () => {
    useModels(answering("VECI es un supermercado"), answering(ANSWER));

    await generateStructured(PROMPT, INPUT, LEDGER);

    const record = JSON.stringify(mocks.recordAiCall.mock.calls);
    expect(record).not.toContain("VECI");
    expect(record).not.toContain("groceries");
    expect(record).not.toContain(PROMPT.instructions);
  });
});
