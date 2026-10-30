import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructured } from "./ai";

// DeepSeek's models are replaced by the AI SDK's mock models, one per model
// id. The SDK itself runs, so its parsing, validation and errors are real.
const mocks = vi.hoisted(() => ({
  apiKey: undefined as string | undefined,
  createDeepSeek: vi.fn(),
  models: new Map<string, MockLanguageModelV4>(),
}));

vi.mock("./env", () => ({
  getServerEnv: () => ({ DEEPSEEK_API_KEY: mocks.apiKey }),
}));
vi.mock("@ai-sdk/deepseek", () => ({ createDeepSeek: mocks.createDeepSeek }));

const API_KEY = "test-deepseek-key";
const INPUT = "COMPRA EN SUPERMERCADO VECI";
const REQUEST = {
  instructions: "Clasifica el movimiento.",
  input: INPUT,
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

beforeEach(() => {
  mocks.apiKey = API_KEY;
  mocks.models.clear();
  mocks.createDeepSeek.mockReset();
  mocks.createDeepSeek.mockImplementation(
    () => (modelId: string) => mocks.models.get(modelId),
  );
});

describe("generateStructured", () => {
  it("makes no call without DeepSeek's key, as in CI", async () => {
    mocks.apiKey = undefined;

    expect(await generateStructured(REQUEST)).toEqual({
      ok: false,
      error: { code: "AI_OFF" },
    });
    expect(mocks.createDeepSeek).not.toHaveBeenCalled();
  });

  it("answers with the first model, as the schema reads it", async () => {
    const { pro } = useModels(answering(ANSWER), answering(ANSWER));

    expect(await generateStructured(REQUEST)).toEqual({
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

    await generateStructured(REQUEST);

    const [call] = flash.doGenerateCalls;
    expect(call?.responseFormat?.type).toBe("json");
    expect(call?.reasoning).toBe("none");
    expect(call?.maxOutputTokens).toBe(200);
    expect(call?.abortSignal).toBeInstanceOf(AbortSignal);
    expect(call?.prompt).toEqual([
      { role: "system", content: REQUEST.instructions },
      { role: "user", content: [{ type: "text", text: INPUT }] },
    ]);
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

    const result = await generateStructured(REQUEST);

    expect(result.ok && result.value.model).toBe("deepseek-v4-pro");
    expect(flash.doGenerateCalls).toHaveLength(1);
  });

  it("fails with a code for each model when both fail", async () => {
    useModels(throwing(apiError(402)), answering("Mercado."));

    expect(await generateStructured(REQUEST)).toEqual({
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

    const result = await generateStructured(REQUEST);

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

    const result = await generateStructured(REQUEST);

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

    const failure = JSON.stringify(await generateStructured(REQUEST));

    expect(failure).not.toContain("VECI");
    expect(failure).not.toContain(REQUEST.instructions);
  });
});
